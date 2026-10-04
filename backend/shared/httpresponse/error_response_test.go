package httpresponse_test

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/melmut-42/ft_transcendence/backend/shared/httpresponse"
)

func TestWriteError(t *testing.T) {
	for _, tt := range []struct {
		name   string
		err    *httpresponse.Error
		status int
		code   string
	}{
		{"default", nil, 500, "INTERNAL_ERROR"},
		{"invalid status", &httpresponse.Error{Status: 200, Code: "private", Message: "private"}, 500, "INTERNAL_ERROR"},
		{"empty definition", &httpresponse.Error{Status: 400}, 500, "INTERNAL_ERROR"},
		{"invalid details", &httpresponse.Error{Status: 400, Code: "private", Message: "private", Details: map[string]any{"value": make(chan int)}}, 500, "INTERNAL_ERROR"},
		{"public", &httpresponse.Error{Status: 422, Code: "INVALID_EMAIL", Message: "Email is invalid.", Details: map[string]any{"field": "email"}}, 422, "INVALID_EMAIL"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			httpresponse.WriteError(response, tt.err)
			var body struct {
				Error httpresponse.Error `json:"error"`
			}
			if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil || response.Code != tt.status || body.Error.Code != tt.code || body.Error.Details == nil || body.Error.Message == "" {
				t.Fatalf("invalid envelope: %d %s", response.Code, response.Body)
			}
			if response.Header().Get("Content-Type") != "application/json; charset=utf-8" || strings.Contains(response.Body.String(), "private") || strings.Contains(response.Body.String(), `"Status"`) {
				t.Fatalf("unexpected content: %s", response.Body)
			}
		})
	}
}
