# Why WiGLE runs out so fast

New WiGLE accounts start with a very small daily search cap. It resets at midnight US/Pacific.

Airgrid used to spend that cap quickly because:

- Wi-Fi, Bluetooth, and cell are **three separate API calls**
- Map click, city jump, geolocation, and page load each triggered a live scan
- Four map clicks with all layers on = 12 queries

# What Airgrid does now

- Every successful scan is saved in this browser (localStorage)
- **Scan** reuses the saved result for that lat/lng/radius/layers set
- **Live refresh** is the only button that spends WiGLE quota on purpose
- The status bar shows `N live queries today`

Turn off layers you do not need before a live refresh.
