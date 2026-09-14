const ENDPOINTS = {
  wifi: "https://api.wigle.net/api/v2/network/search",
  bluetooth: "https://api.wigle.net/api/v2/bluetooth/search",
  cell: "https://api.wigle.net/api/v2/cell/search",
};

function boundingBox(lat, lng, radiusKm) {
  const latDelta = radiusKm / 111.32;
  const lngDelta = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180) || 0.01);
  return {
    latrange1: lat - latDelta,
    latrange2: lat + latDelta,
    longrange1: lng - lngDelta,
    longrange2: lng + lngDelta,
  };
}

function lastupdtDays(days) {
  const d = new Date(Date.now() - days * 86400000);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}000000`;
}

function haversineKm(aLat, aLng, bLat, bLng) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function mapRow(row, kind, origin) {
  const lat = Number(row.trilat ?? row.latitude ?? row.lat);
  const lng = Number(row.trilong ?? row.longitude ?? row.lon ?? row.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const name =
    String(row.ssid || row.name || row.operator || "").trim() ||
    (kind === "cell" ? "Cell site" : kind === "bluetooth" ? "BT device" : "Hidden");
  const id = String(row.netid || row.id || row.bssid || `${kind}-${lat}-${lng}`);
  return {
    kind,
    id,
    name,
    lat,
    lng,
    encryption: String(row.encryption || row.capabilities || "").trim() || null,
    channel: row.channel != null ? String(row.channel) : null,
    type: String(row.type || row.gentype || row.network_type || kind).trim(),
    lastupdt: row.lastupdt || row.lasttime || null,
    firsttime: row.firsttime || null,
    qos: row.qos != null ? Number(row.qos) : null,
    city: row.city || null,
    road: row.road || null,
    distanceKm: origin ? haversineKm(origin.lat, origin.lng, lat, lng) : null,
    rawType: kind,
  };
}

function seeded(lat, lng, n) {
  const x = Math.sin(lat * 12.9898 + lng * 78.233 + n * 0.137) * 43758.5453;
  return x - Math.floor(x);
}

function demoNetworks(lat, lng, radiusKm) {
  const wifiNames = ["Lakeland-Guest","NETGEAR-5G","xfinitywifi","SpectrumSetup","HOME-2.4","CafeOpen","ATT-WIFI","TP-Link_Office","PixelHotspot","HIDDEN"];
  const enc = ["WPA2","WPA3","WPA2","WEP","none","WPA2","WPA3","WPA","WPA2","none"];
  const btNames = ["AirPods Pro","Tesla Model 3","JBL Flip","Apple Watch","Galaxy Buds","Tile Tracker","CarKit-BT","Logitech Mouse"];
  const cellNames = ["Verizon LTE","T-Mobile 5G","AT&T LTE","Verizon 5G","T-Mobile LTE","AT&T 5G NR"];
  const out = [];
  const count = Math.max(18, Math.round(28 + radiusKm * 16));
  for (let i = 0; i < count; i++) {
    const a = seeded(lat, lng, i) * Math.PI * 2;
    const r = Math.sqrt(seeded(lat, lng, i + 40)) * radiusKm;
    const dLat = (r * Math.cos(a)) / 111.32;
    const dLng = (r * Math.sin(a)) / (111.32 * Math.cos((lat * Math.PI) / 180));
    const nLat = lat + dLat;
    const nLng = lng + dLng;
    if (i % 5 === 0) {
      const name = cellNames[i % cellNames.length];
      out.push({ kind: "cell", id: `cell-${i}-${Math.round(nLat * 1e5)}`, name, lat: nLat, lng: nLng, encryption: null, channel: String(1800 + (i % 40) * 5), type: name.includes("5G") ? "NR" : "LTE", lastupdt: "2026-08-01", firsttime: "2022-03-12", qos: 5, city: null, road: null, distanceKm: r, rawType: "cell" });
    } else if (i % 3 === 0) {
      out.push({ kind: "bluetooth", id: `bt-${i}-${Math.round(nLat * 1e5)}`, name: btNames[i % btNames.length], lat: nLat, lng: nLng, encryption: null, channel: null, type: i % 2 === 0 ? "BLE" : "BT", lastupdt: "2026-07-18", firsttime: "2024-11-02", qos: 3, city: null, road: null, distanceKm: r, rawType: "bluetooth" });
    } else {
      const name = wifiNames[i % wifiNames.length];
      out.push({ kind: "wifi", id: `wifi-${i}-${Math.round(nLat * 1e5)}`, name: name === "HIDDEN" ? "" : name, lat: nLat, lng: nLng, encryption: enc[i % enc.length], channel: String(1 + (i % 11)), type: "WIFI", lastupdt: "2026-08-12", firsttime: "2021-06-04", qos: 4, city: null, road: null, distanceKm: r, rawType: "wifi" });
    }
  }
  return out;
}

async function queryWigle(url, auth, box, origin, extra = {}) {
  const params = new URLSearchParams();
  params.set("latrange1", String(box.latrange1));
  params.set("latrange2", String(box.latrange2));
  params.set("longrange1", String(box.longrange1));
  params.set("longrange2", String(box.longrange2));
  params.set("closestLat", String(origin.lat));
  params.set("closestLong", String(origin.lng));
  params.set("resultsPerPage", "100");
  params.set("lastupdt", lastupdtDays(730));
  for (const [k, v] of Object.entries(extra)) params.set(k, v);
  return fetch(`${url}?${params}`, {
    headers: { Accept: "application/json", Authorization: `Basic ${auth}`, "User-Agent": "Airgrid/2.0" },
    signal: AbortSignal.timeout(20000),
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const radiusKm = Math.min(20, Math.max(0.1, Number(body.radiusKm) || 0.5));
  const layers = Array.isArray(body.layers) ? body.layers : ["wifi", "bluetooth", "cell"];
  const apiName = String(body.apiName || "").trim();
  const apiToken = String(body.apiToken || "").trim();
  const demo = Boolean(body.demo) || !apiName || !apiToken;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: "lat and lng required" });
  }

  if (demo) {
    const results = demoNetworks(lat, lng, radiusKm).filter((n) => layers.includes(n.kind));
    return res.status(200).json({
      success: true,
      source: "demo",
      results,
      totals: {
        wifi: results.filter((n) => n.kind === "wifi").length,
        bluetooth: results.filter((n) => n.kind === "bluetooth").length,
        cell: results.filter((n) => n.kind === "cell").length,
      },
    });
  }

  const box = boundingBox(lat, lng, radiusKm);
  const auth = Buffer.from(`${apiName}:${apiToken}`).toString("base64");
  const origin = { lat, lng };
  const results = [];
  const errors = [];
  const jobs = [];
  if (layers.includes("wifi")) jobs.push(["wifi", ENDPOINTS.wifi, {}]);
  if (layers.includes("bluetooth")) jobs.push(["bluetooth", ENDPOINTS.bluetooth, { showBle: "true" }]);
  if (layers.includes("cell")) jobs.push(["cell", ENDPOINTS.cell, { showGsm: "true", showCdma: "true", showLte: "true", showWcdma: "true", showNr: "true" }]);

  for (const [kind, url, extra] of jobs) {
    try {
      const response = await queryWigle(url, auth, box, origin, extra);
      if (response.status === 401) {
        return res.status(401).json({ error: "WiGLE rejected those credentials. Use API Name + API Token from wigle.net/account, not the encoded blob." });
      }
      if (response.status === 429) {
        return res.status(429).json({ error: "Daily WiGLE query limit reached. Try sample data, or wait until midnight Pacific." });
      }
      if (!response.ok) { errors.push(`${kind}: ${response.status}`); continue; }
      const payload = await response.json();
      const rows = Array.isArray(payload.results) ? payload.results : [];
      for (const row of rows) {
        const mapped = mapRow(row, kind, origin);
        if (mapped) results.push(mapped);
      }
    } catch (err) {
      errors.push(`${kind}: ${err.message || "request failed"}`);
    }
  }

  return res.status(200).json({
    success: true,
    source: "live",
    results,
    errors,
    totals: {
      wifi: results.filter((n) => n.kind === "wifi").length,
      bluetooth: results.filter((n) => n.kind === "bluetooth").length,
      cell: results.filter((n) => n.kind === "cell").length,
    },
  });
}
