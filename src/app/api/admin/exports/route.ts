import { NextResponse } from "next/server";
import { exportCustomersCsv, exportResponsesCsv } from "@/services/export.service";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const type = searchParams.get("type") || "responses";

	try {
		if (type === "customers") {
			const csv = await exportCustomersCsv();
			return new NextResponse(csv, {
				status: 200,
				headers: {
					"Content-Type": "text/csv",
					"Content-Disposition": "attachment; filename=customers.csv",
				},
			});
		}

		const csv = await exportResponsesCsv();
		return new NextResponse(csv, {
			status: 200,
			headers: {
				"Content-Type": "text/csv",
				"Content-Disposition": "attachment; filename=responses.csv",
			},
		});
	} catch (error) {
		console.error("admin/exports error", error);
		return NextResponse.json({ error: "Failed to export" }, { status: 500 });
	}
}
