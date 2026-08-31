from app.modules.geo.nominatim import nominatim_reverse, parse_nominatim_payload, short_address


def test_short_address_keeps_first_four_parts() -> None:
    label = short_address(
        "12, 5th Cross, Koramangala 5th Block, Bengaluru, Karnataka, 560034, India"
    )
    assert label == "12, 5th Cross, Koramangala 5th Block, Bengaluru"


def test_parse_nominatim_payload_maps_address_fields() -> None:
    parsed = parse_nominatim_payload(
        {
            "display_name": "5th Cross, Koramangala 5th Block, Bengaluru, India",
            "address": {
                "road": "5th Cross",
                "suburb": "Koramangala",
                "city": "Bengaluru",
                "postcode": "560034",
            },
        },
        lat=12.9352,
        lng=77.6245,
    )
    assert parsed["label"] == "5th Cross, Koramangala 5th Block, Bengaluru, India"
    assert parsed["locality"] == "Koramangala"
    assert parsed["city"] == "Bengaluru"
    assert parsed["postal_code"] == "560034"
    assert parsed["source"] == "nominatim"


def test_nominatim_reverse_sends_user_agent(monkeypatch) -> None:
    captured: dict[str, object] = {}

    class _Response:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, object]:
            return {
                "display_name": "Koramangala, Bengaluru, Karnataka, India",
                "address": {"suburb": "Koramangala", "city": "Bengaluru"},
            }

    def fake_get(url, params=None, headers=None, timeout=None):
        captured["url"] = url
        captured["headers"] = headers
        captured["timeout"] = timeout
        return _Response()

    monkeypatch.setattr("app.modules.geo.nominatim.httpx.get", fake_get)
    result = nominatim_reverse(12.9352, 77.6245)
    assert result is not None
    assert "CARATOM" in captured["headers"]["User-Agent"]
    assert captured["url"] == "https://nominatim.openstreetmap.org/reverse"
