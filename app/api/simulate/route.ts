import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { parseStringPromise } from "xml2js";
import { IOSDevicesList, TrackPoint } from "@/types/gpx";

function parseCoords(text: string): [string, string][] {
	return text
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const [lat, lon] = line.split(",").map((n) => n.trim());
			return [lat, lon];
		});
}

async function getBootedIOSSimulators(): Promise<string[]> {
	return new Promise((resolve, reject) => {
		exec(`xcrun simctl list devices booted --json`, (err, stdout) => {
			if (err) return reject(err);
			try {
				const devicesJson: IOSDevicesList = JSON.parse(stdout);
				const deviceIds: string[] = [];
				Object.values(devicesJson.devices).forEach((deviceList) => {
					deviceList.forEach((device) => {
						if (device.state === "Booted") {
							deviceIds.push(device.udid);
						}
					});
				});
				resolve(deviceIds);
			} catch (e) {
				reject(e);
			}
		});
	});
}

async function runSimCommandIOS(deviceIds: string[], lat: string, lon: string) {
	for (const deviceId of deviceIds) {
		try {
			await new Promise<void>((resolve, reject) => {
				const command = `xcrun simctl location ${deviceId} set ${lat},${lon}`;
				exec(command, (err, stdout, stderr) => {
					if (err) return reject(new Error(stderr || stdout || err.message));
					resolve();
				});
			});
		} catch (error) {
			console.error(`Error al ejecutar comando iOS para dispositivo ${deviceId}:`, error);
		}
	}
}

async function getAndroidDevices(): Promise<string[]> {
	return new Promise((resolve, reject) => {
		exec(`adb devices`, (err, stdout) => {
			if (err) return reject(err);
			const lines = stdout.split("\n").slice(1);
			const deviceIds = lines.map((line) => line.split("\t")[0]).filter((id) => id && !id.includes("offline") && /^[a-zA-Z0-9-_]+$/.test(id));
			resolve(deviceIds);
		});
	});
}

async function runSimCommandAndroid(deviceIds: string[], lat: string, lon: string) {
	for (const deviceId of deviceIds) {
		try {
			await new Promise<void>((resolve, reject) => {
				const command = `adb -s ${deviceId} emu geo fix ${lon} ${lat}`;
				exec(command, (err, stdout, stderr) => {
					if (err) return reject(new Error(stderr || stdout || err.message));
					resolve();
				});
			});
		} catch (error) {
			console.error(`Error al ejecutar comando Android para dispositivo ${deviceId}:`, error);
		}
	}
}

async function extractCoords(data: FormData): Promise<[string, string][]> {
	if (data.has("manual")) {
		const val = data.get("manual")?.toString() ?? "";
		return parseCoords(val);
	}
	if (data.has("batch")) {
		const val = data.get("batch")?.toString() ?? "";
		return parseCoords(val);
	}
	if (data.has("gpx")) {
		const file = data.get("gpx") as File;
		const text = await file.text();
		const parsed = await parseStringPromise(text);
		const trackPoints = parsed.gpx.trk[0].trkseg[0].trkpt;
		return trackPoints.map((pt: TrackPoint) => [pt.$.lat, pt.$.lon]);
	}
	return [];
}

async function simulateLocations(platform: string, coords: [string, string][], delayMs = 1500): Promise<void> {
	if (platform === "ios") {
		const deviceIds = await getBootedIOSSimulators();
		if (deviceIds.length === 0) throw new Error("No hay simuladores iOS encendidos");

		for (const [lat, lon] of coords) {
			await runSimCommandIOS(deviceIds, lat, lon);
			await new Promise((res) => setTimeout(res, delayMs));
		}
	} else {
		const deviceIds = await getAndroidDevices();
		if (deviceIds.length === 0) throw new Error("No hay emuladores Android conectados");

		for (const [lat, lon] of coords) {
			await runSimCommandAndroid(deviceIds, lat, lon);
			await new Promise((res) => setTimeout(res, delayMs));
		}
	}
}

export async function POST(req: NextRequest) {
	try {
		const data = await req.formData();
		const platform = (data.get("platform")?.toString() || "android").toLowerCase();

		const coords = await extractCoords(data);
		if (coords.length === 0) throw new Error("No se proporcionaron coordenadas");

		await simulateLocations(platform, coords);

		return NextResponse.json({ total: coords.length });
	} catch (e) {
		if (e instanceof Error) {
			return NextResponse.json({ error: e.message }, { status: 500 });
		}
		return NextResponse.json({ error: "Ocurrió un error desconocido" }, { status: 500 });
	}
}
