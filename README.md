# Airgrid

Scan a lat/lng radius for **Wi-Fi**, **Bluetooth/BLE**, and **cell towers** from the [WiGLE](https://wigle.net) API.

## Use it
1. Open the live site.
2. Enter coordinates or click the map / use My location.
3. Toggle Wi-Fi, Bluetooth, and Cell.
4. Optional: add your WiGLE **API Name** + **API Token** from https://wigle.net/account (not the encoded-for-use field).
5. Scan.

Without a key, Airgrid maps sample networks around the point you pick.

A live three-layer scan uses three WiGLE daily queries.

## API
- Wi-Fi: `GET /api/v2/network/search`
- Bluetooth: `GET /api/v2/bluetooth/search`
- Cell: `GET /api/v2/cell/search`

Browser calls `/api/search` so credentials never hit WiGLE from the client.
