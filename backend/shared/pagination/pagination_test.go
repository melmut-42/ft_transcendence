package pagination_test

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/url"
	"reflect"
	"strconv"
	"strings"
	"testing"

	"github.com/melmut-42/ft_transcendence/backend/shared/pagination"
)

func query(t *testing.T, raw string) url.Values {
	t.Helper()
	values, err := url.ParseQuery(raw)
	if err != nil {
		t.Fatal(err)
	}
	return values
}

// TestParseOffset checks default and endpoint-specific limits, explicit offsets,
// inclusive upper bounds, and ignored unrelated query parameters. Each valid
// request must reserve one extra row through FetchLimit.
func TestParseOffset(t *testing.T) {
	tests := []struct {
		name   string
		query  string
		limits pagination.Limits
		limit  int
		offset int64
	}{
		{name: "defaults", limit: 20},
		{name: "friends defaults", limits: pagination.Limits{Default: 50, Max: 100}, limit: 50},
		{name: "custom page", query: "limit=5&offset=15", limit: 5, offset: 15},
		{name: "upper limit", query: "limit=100&offset=0", limit: 100},
		{name: "search limit", query: "limit=50", limits: pagination.Limits{Default: 20, Max: 50}, limit: 50},
		{name: "large offset", query: "offset=9223372036854775807", limit: 20, offset: math.MaxInt64},
		{name: "unrelated params", query: "q=hello", limit: 20},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p, err := pagination.ParseOffset(query(t, tt.query), tt.limits)
			if err != nil {
				t.Fatal(err)
			}
			if p.Limit() != tt.limit || p.Offset() != tt.offset || p.FetchLimit() != tt.limit+1 {
				t.Fatalf("got limit=%d offset=%d fetch=%d", p.Limit(), p.Offset(), p.FetchLimit())
			}
		})
	}
}

// TestInvalidOffsetQueries checks that empty, repeated, malformed, negative,
// overflowing, and out-of-range query values identify the offending parameter
// in a ValidationError, including limits above an endpoint-specific maximum.
func TestInvalidOffsetQueries(t *testing.T) {
	for _, field := range []string{"limit", "offset"} {
		invalid := []string{"", "-1", "1.5", "hello", " 2", "2 ", "9223372036854775808"}
		if field == "limit" {
			invalid = append(invalid, "0", "101")
		}
		for _, value := range invalid {
			t.Run(field+"="+value, func(t *testing.T) {
				_, err := pagination.ParseOffset(url.Values{field: {value}}, pagination.Limits{})
				assertParameterError(t, err, field)
			})
		}
		for _, values := range [][]string{nil, {}, {"1", "2"}} {
			_, err := pagination.ParseOffset(url.Values{field: values}, pagination.Limits{})
			assertParameterError(t, err, field)
		}
	}
	_, err := pagination.ParseOffset(query(t, "limit=51"), pagination.Limits{Default: 20, Max: 50})
	assertParameterError(t, err, "limit")
}

func assertParameterError(t *testing.T, err error, field string) {
	t.Helper()
	var validation *pagination.ValidationError
	if !errors.As(err, &validation) || validation.Parameter != field || validation.Error() == "" {
		t.Fatalf("expected validation error for %s, got %v", field, err)
	}
}

// TestLimits checks that both parsers reject invalid limit configurations.
// It also verifies that the largest accepted page size leaves room for the
// lookahead row without overflowing FetchLimit.
func TestLimits(t *testing.T) {
	for _, limits := range []pagination.Limits{
		{Default: -1}, {Max: -1}, {Default: 101}, {Max: 10},
		{Default: 5, Max: 4}, {Max: math.MaxInt},
	} {
		if _, err := pagination.ParseOffset(nil, limits); !errors.Is(err, pagination.ErrInvalidLimits) {
			t.Fatalf("offset limits %+v: %v", limits, err)
		}
		if _, err := pagination.ParseRef(nil, "before", limits); !errors.Is(err, pagination.ErrInvalidLimits) {
			t.Fatalf("ref limits %+v: %v", limits, err)
		}
	}
	// Even the largest accepted limit leaves space for a lookahead row.
	p, err := pagination.ParseOffset(query(t, "limit="+strconv.Itoa(math.MaxInt-1)), pagination.Limits{Max: math.MaxInt - 1})
	if err != nil || p.FetchLimit() != math.MaxInt {
		t.Fatalf("fetch limit overflow: %d, %v", p.FetchLimit(), err)
	}
}

// TestParseRef checks the default ref key and explicit ref/before/after keys,
// first-page defaults, and preservation of valid raw references. It rejects
// invalid references, excessive limits, and a reference key named limit.
func TestParseRef(t *testing.T) {
	for _, name := range []string{"", "ref", "before", "after"} {
		key := name
		if key == "" {
			key = "ref"
		}
		p, err := pagination.ParseRef(nil, name, pagination.Limits{Default: 50})
		if err != nil || p.Ref() != "" || p.Limit() != 50 || p.FetchLimit() != 51 {
			t.Fatalf("first page %q: %+v, %v", name, p, err)
		}
		for _, ref := range []string{"opaque-cursor", "2026-09-10T08:50:00.123456Z", strings.Repeat("a", pagination.MaxRefLength)} {
			p, err := pagination.ParseRef(url.Values{key: {ref}, "limit": {"5"}}, name, pagination.Limits{})
			if err != nil || p.Ref() != ref || p.Limit() != 5 {
				t.Fatalf("reference %q: %+v, %v", name, p, err)
			}
		}
		for _, refs := range [][]string{nil, {""}, {"   "}, {"one", "two"}, {strings.Repeat("a", pagination.MaxRefLength+1)}} {
			_, err := pagination.ParseRef(url.Values{key: refs}, name, pagination.Limits{})
			assertParameterError(t, err, key)
		}
	}
	_, err := pagination.ParseRef(query(t, "limit=51"), "before", pagination.Limits{Default: 20, Max: 50})
	assertParameterError(t, err, "limit")
	if _, err := pagination.ParseRef(nil, "limit", pagination.Limits{}); err == nil {
		t.Fatal("reference parameter must not collide with limit")
	}
}

// TestZeroValueRequests checks that uninitialized offset and reference requests
// select the first page with the default limit and one extra fetch row.
func TestZeroValueRequests(t *testing.T) {
	var offset pagination.OffsetParams
	var ref pagination.RefParams
	if offset.Limit() != 20 || offset.FetchLimit() != 21 || offset.Offset() != 0 ||
		ref.Limit() != 20 || ref.FetchLimit() != 21 || ref.Ref() != "" {
		t.Fatal("zero values must select the default first page")
	}
}

// TestBuildOffsetPage checks the JSON response for empty, short, full, and
// lookahead-containing result sets. It verifies [] for nil rows, applied limit
// and offset values, and has_more only when an extra row exists.
func TestBuildOffsetPage(t *testing.T) {
	p, err := pagination.ParseOffset(query(t, "limit=2&offset=4"), pagination.Limits{})
	if err != nil {
		t.Fatal(err)
	}
	for _, tt := range []struct {
		name string
		rows []int
		want string
	}{
		{"empty", nil, `{"results":[],"limit":2,"offset":4,"has_more":false}`},
		{"short", []int{5}, `{"results":[5],"limit":2,"offset":4,"has_more":false}`},
		{"exact", []int{5, 6}, `{"results":[5,6],"limit":2,"offset":4,"has_more":false}`},
		{"next page", []int{5, 6, 7}, `{"results":[5,6],"limit":2,"offset":4,"has_more":true}`},
	} {
		t.Run(tt.name, func(t *testing.T) {
			items, meta := pagination.BuildOffsetPage(p, tt.rows)
			response := struct {
				Results []int `json:"results"`
				pagination.OffsetMeta
			}{items, meta}
			data, err := json.Marshal(response)
			if err != nil || string(data) != tt.want {
				t.Fatalf("response: %s, %v; want %s", data, err, tt.want)
			}
		})
	}
}

// TestBuildRefPage checks that terminal pages skip encoding and emit a null
// next_cursor, while another page uses the last returned item's reference.
// It also verifies encoder error propagation and rejection of missing encoders
// or blank and oversized generated references when another page exists.
func TestBuildRefPage(t *testing.T) {
	p, err := pagination.ParseRef(query(t, "limit=2"), "before", pagination.Limits{})
	if err != nil {
		t.Fatal(err)
	}
	for _, rows := range [][]int{nil, {1}, {1, 2}} {
		items, meta, err := pagination.BuildRefPage(p, rows, func(int) (string, error) {
			t.Fatal("encoder must not run on the last page")
			return "", nil
		})
		if err != nil || meta.NextCursor != nil || items == nil || len(items) != len(rows) {
			t.Fatalf("terminal page: %v, %+v, %v", items, meta, err)
		}
		data, err := json.Marshal(meta)
		if err != nil || string(data) != `{"next_cursor":null}` {
			t.Fatalf("terminal metadata: %s, %v", data, err)
		}
	}
	items, meta, err := pagination.BuildRefPage(p, []int{9, 8, 7}, func(id int) (string, error) {
		return strconv.Itoa(id), nil
	})
	if err != nil || !reflect.DeepEqual(items, []int{9, 8}) || meta.NextCursor == nil || *meta.NextCursor != "8" {
		t.Fatalf("next page must use the last returned row: %v, %+v, %v", items, meta, err)
	}
	data, err := json.Marshal(meta)
	if err != nil || string(data) != `{"next_cursor":"8"}` {
		t.Fatalf("next metadata: %s, %v", data, err)
	}
	sentinel := errors.New("encode failed")
	_, _, err = pagination.BuildRefPage(p, []int{1, 2, 3}, func(int) (string, error) { return "", sentinel })
	if !errors.Is(err, sentinel) {
		t.Fatalf("lost encoder error: %v", err)
	}
	if _, _, err := pagination.BuildRefPage(p, []int{1, 2, 3}, nil); err == nil {
		t.Fatal("missing encoder must fail when there is a next page")
	}
	for _, value := range []string{"", " ", strings.Repeat("a", pagination.MaxRefLength+1)} {
		_, _, err := pagination.BuildRefPage(p, []int{1, 2, 3}, func(int) (string, error) { return value, nil })
		if !errors.Is(err, pagination.ErrInvalidCursor) {
			t.Fatalf("invalid generated cursor: %v", err)
		}
	}
}

// TestRefPaginationAcrossPages traverses a dataset with equal primary sort
// values using a composite time/ID cursor. Every record must appear exactly
// once, in order, across page boundaries.
func TestRefPaginationAcrossPages(t *testing.T) {
	type key struct {
		Time int64 `json:"time"`
		ID   int64 `json:"id"`
	}
	all := []key{{3, 6}, {3, 5}, {3, 4}, {2, 3}, {2, 2}, {1, 1}}
	var seen []key
	values := url.Values{"limit": {"2"}}
	for page := 0; page < 4; page++ {
		p, err := pagination.ParseRef(values, "before", pagination.Limits{})
		if err != nil {
			t.Fatal(err)
		}
		var cursor key
		if p.Ref() != "" {
			cursor, err = pagination.DecodeCursor[key](p.Ref())
			if err != nil {
				t.Fatal(err)
			}
		}
		var rows []key
		for _, row := range all {
			if p.Ref() == "" || row.Time < cursor.Time || (row.Time == cursor.Time && row.ID < cursor.ID) {
				rows = append(rows, row)
				if len(rows) == p.FetchLimit() {
					break
				}
			}
		}
		items, meta, err := pagination.BuildRefPage(p, rows, func(row key) (string, error) {
			return pagination.EncodeCursor(row)
		})
		if err != nil {
			t.Fatal(err)
		}
		seen = append(seen, items...)
		if meta.NextCursor == nil {
			break
		}
		values.Set("before", *meta.NextCursor)
	}
	if !reflect.DeepEqual(seen, all) {
		t.Fatalf("records skipped or duplicated: got %v, want %v", seen, all)
	}
}

// TestCursorCodec checks lossless encoding/decoding and unpadded URL-safe output.
// Invalid payloads and malformed cursors must match ErrInvalidCursor; decoding
// failures must return a zero value even after partial JSON assignment.
func TestCursorCodec(t *testing.T) {
	type cursor struct {
		ID     int64  `json:"id"`
		UserID int64  `json:"user_id"`
		Time   string `json:"time"`
	}
	want := cursor{math.MaxInt64, 42, "2026-09-10T08:50:00.123456Z"}
	ref, err := pagination.EncodeCursor(want)
	if err != nil || strings.ContainsAny(ref, "+/=") {
		t.Fatalf("cursor must be unpadded and URL safe: %q, %v", ref, err)
	}
	got, err := pagination.DecodeCursor[cursor](ref)
	if err != nil || got != want {
		t.Fatalf("round trip: %+v, %v", got, err)
	}
	for _, value := range []any{nil, (*cursor)(nil), func() {}, strings.Repeat("a", pagination.MaxRefLength)} {
		if _, err := pagination.EncodeCursor(value); !errors.Is(err, pagination.ErrInvalidCursor) {
			t.Fatalf("invalid payload %T: %v", value, err)
		}
	}
	encodeRaw := base64.RawURLEncoding.EncodeToString
	for _, value := range []string{
		"", "%%%", ref + "=", ref + "\n", strings.Repeat("a", pagination.MaxRefLength+1),
		encodeRaw([]byte("not json")), encodeRaw([]byte("null")), encodeRaw([]byte(" null ")),
		encodeRaw([]byte(`{"id":1} {"id":2}`)), encodeRaw([]byte(`{"id":1,"user_id":"wrong type"}`)),
		encodeRaw([]byte(`{"id":9223372036854775808}`)),
	} {
		got, err := pagination.DecodeCursor[cursor](value)
		if !errors.Is(err, pagination.ErrInvalidCursor) || got != (cursor{}) {
			t.Fatalf("invalid cursor must return zero value and error: %+v, %v", got, err)
		}
	}
}

// TestValidateLimit checks typed values without HTTP parsing, including explicit
// zero, endpoint maxima, invalid configuration, and room for a lookahead row.
func TestValidateLimit(t *testing.T) {
	tests := []struct {
		name   string
		value  int
		limits pagination.Limits
		want   string
	}{
		{name: "minimum", value: 1},
		{name: "default maximum", value: pagination.MaxLimit},
		{name: "custom maximum", value: 5, limits: pagination.Limits{Default: 2, Max: 5}},
		{name: "largest safe limit", value: math.MaxInt - 1, limits: pagination.Limits{Max: math.MaxInt - 1}},
		{name: "explicit zero", value: 0, want: "limit"},
		{name: "negative", value: -1, want: "limit"},
		{name: "above maximum", value: 51, limits: pagination.Limits{Default: 20, Max: 50}, want: "limit"},
		{name: "invalid default", value: 1, limits: pagination.Limits{Default: -1}, want: "config"},
		{name: "invalid bounds", value: 1, limits: pagination.Limits{Default: 5, Max: 4}, want: "config"},
		{name: "no lookahead space", value: 1, limits: pagination.Limits{Max: math.MaxInt}, want: "config"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := pagination.ValidateLimit(tt.value, tt.limits)
			switch tt.want {
			case "config":
				if !errors.Is(err, pagination.ErrInvalidLimits) {
					t.Fatalf("expected configuration error, got %v", err)
				}
			case "limit":
				assertParameterError(t, err, "limit")
			default:
				if err != nil {
					t.Fatal(err)
				}
			}
		})
	}
}

// TestValidateOffset checks that direct validation accepts zero and MaxInt64
// while reporting negative offsets against the correct field.
func TestValidateOffset(t *testing.T) {
	for _, offset := range []int64{0, 1, math.MaxInt64} {
		if err := pagination.ValidateOffset(offset); err != nil {
			t.Fatalf("offset %d: %v", offset, err)
		}
	}
	for _, offset := range []int64{-1, math.MinInt64} {
		assertParameterError(t, pagination.ValidateOffset(offset), "offset")
	}
}

// TestValidateRef checks field names, supplied-value semantics, and byte limits
// for multibyte text. Cursor decoding remains a separate operation.
func TestValidateRef(t *testing.T) {
	for _, name := range []string{"", "ref", "before", "after"} {
		field := name
		if field == "" {
			field = "ref"
		}
		t.Run(field, func(t *testing.T) {
			for _, ref := range []string{
				"opaque-reference", "2026-09-10T08:50:00Z",
				strings.Repeat("a", pagination.MaxRefLength),
				strings.Repeat("é", pagination.MaxRefLength/2),
			} {
				if err := pagination.ValidateRef(ref, name); err != nil {
					t.Fatalf("valid reference: %v", err)
				}
			}
			for _, ref := range []string{
				"", " \t\n", "\u2003",
				strings.Repeat("a", pagination.MaxRefLength+1),
				strings.Repeat("é", pagination.MaxRefLength/2+1),
			} {
				assertParameterError(t, pagination.ValidateRef(ref, name), field)
			}
		})
	}
	err := pagination.ValidateRef("cursor", "limit")
	var validation *pagination.ValidationError
	if err == nil || errors.As(err, &validation) {
		t.Fatalf("expected a configuration error for the reserved name, got %v", err)
	}
}

// ExampleBuildOffsetPage demonstrates parsing an offset request and trimming
// a lookahead row. The output shows two returned friends and has_more=true.
func ExampleBuildOffsetPage() {
	params, err := pagination.ParseOffset(url.Values{
		"limit":  {"2"},
		"offset": {"4"},
	}, pagination.Limits{Default: 20, Max: 50})
	if err != nil {
		panic(err)
	}

	// The repository applies OFFSET 4 and fetches up to FetchLimit() rows
	// in deterministic order. The third row indicates another page exists.
	rows := []string{"friend-5", "friend-6", "friend-7"}
	items, meta := pagination.BuildOffsetPage(params, rows)
	fmt.Println("fetch:", params.FetchLimit())
	fmt.Println("items:", items)
	fmt.Println("limit, offset, has_more:", meta.Limit, meta.Offset, meta.HasMore)
	// Output:
	// fetch: 3
	// items: [friend-5 friend-6]
	// limit, offset, has_more: 2 4 true
}

// ExampleBuildRefPage demonstrates a page ordered by descending ID and an
// encoded continuation cursor. Decoding that cursor yields the last returned
// ID, which becomes the next request's exclusive upper bound.
func ExampleBuildRefPage() {
	params, err := pagination.ParseRef(url.Values{"limit": {"2"}}, "before", pagination.Limits{})
	if err != nil {
		panic(err)
	}

	type cursor struct {
		ID int64 `json:"id"`
	}
	// This endpoint orders by unique ID descending. The repository has already
	// applied its access checks and fetched up to params.FetchLimit() rows.
	rows := []int64{9, 8, 7}
	items, meta, err := pagination.BuildRefPage(params, rows, func(id int64) (string, error) {
		return pagination.EncodeCursor(cursor{ID: id})
	})
	if err != nil {
		panic(err)
	}

	fmt.Println("items:", items)
	if meta.NextCursor != nil {
		// A subsequent request supplies next_cursor as before. The service
		// decodes it, validates the ID, and queries authorized rows with id < ID.
		next, err := pagination.DecodeCursor[cursor](*meta.NextCursor)
		if err != nil {
			panic(err)
		}
		fmt.Println("next page before ID:", next.ID)
	}
	// Output:
	// items: [9 8]
	// next page before ID: 8
}
