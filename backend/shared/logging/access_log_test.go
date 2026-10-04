package logging

import (
	"bytes"
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"
)

// TestAccessLogFormats checks usable JSON, single-line text, UTC timestamps and
// severity filtering for successful, client-error and server-error responses.
func TestAccessLogFormats(t *testing.T) {
	for _, format := range []string{"text", "json"} {
		for _, threshold := range []struct {
			level    string
			statuses []int
		}{
			{"debug", []int{200, 302, 400, 500}},
			{"info", []int{200, 302, 400, 500}},
			{"warn", []int{400, 500}},
			{"error", []int{500}},
		} {
			t.Run(format+"/"+threshold.level, func(t *testing.T) {
				var output bytes.Buffer
				logger, err := New(Config{Format: format, Level: threshold.level, Service: "test-service"}, &output)
				if err != nil {
					t.Fatal(err)
				}
				stamp := time.Date(2026, 10, 2, 14, 30, 0, 123, time.FixedZone("local", 3*60*60))
				for _, status := range []int{200, 302, 400, 500} {
					LogAccess(context.Background(), logger, AccessLog{
						Time: stamp, RequestID: "request-123", Status: status,
						Latency: 85 * time.Millisecond, Method: "GET", Path: "/path\nforged\"value",
					})
				}
				lines := strings.Split(strings.TrimSuffix(output.String(), "\n"), "\n")
				if len(lines) != len(threshold.statuses) {
					t.Fatalf("wrong record count: %s", output.String())
				}
				for i, line := range lines {
					status := threshold.statuses[i]
					level := "INFO"
					if status >= 500 {
						level = "ERROR"
					} else if status >= 400 {
						level = "WARN"
					}
					if format == "json" {
						var record map[string]any
						if err := json.Unmarshal([]byte(line), &record); err != nil {
							t.Fatal(err)
						}
						if record["status"] != float64(status) || record["level"] != level || record["service"] != "test-service" ||
							record["time"] != stamp.UTC().Format(time.RFC3339Nano) || record["latency"] != "85ms" || record["path"] != "/path\nforged\"value" {
							t.Fatalf("unexpected record: %s", line)
						}
					} else if !strings.Contains(line, "level="+level) || !strings.Contains(line, stamp.UTC().Format(time.RFC3339Nano)) ||
						!strings.Contains(line, "service=test-service") || !strings.Contains(line, `path="/path\nforged\"value"`) {
						t.Fatalf("unexpected text record: %s", line)
					}
				}
			})
		}
	}
}

func TestLoggerLevels(t *testing.T) {
	var output bytes.Buffer
	logger, err := New(Config{Format: "json", Level: "warn", Service: "test-service"}, &output)
	if err != nil {
		t.Fatal(err)
	}
	logger.Debug("debug")
	logger.Info("info")
	logger.Warn("warn")
	logger.Error("error")
	if strings.Count(output.String(), "\n") != 2 {
		t.Fatalf("unexpected application logs: %s", output.String())
	}
	for _, cfg := range []Config{{Format: "xml"}, {Level: "trace"}} {
		if _, err := New(cfg, &output); err == nil {
			t.Fatalf("invalid config accepted: %+v", cfg)
		}
	}
}
