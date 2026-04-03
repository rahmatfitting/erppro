import { executeQuery } from "./db";

export async function addLogHistory(
  menu: string,
  nomor_transaksi: number,
  aksi: "CREATE" | "EDIT" | "DELETE" | "APPROVE" | "DISAPPROVE",
  user: string,
  keterangan: string = ""
) {
  try {
    await executeQuery(
      `INSERT INTO tloghistory (menu, nomor_transaksi, aksi, user, waktu, keterangan)
       VALUES (?, ?, ?, ?, NOW(), ?)`,
      [menu, nomor_transaksi, aksi, user, keterangan]
    );
  } catch (error) {
    console.error("Failed to add log history:", error);
  }
}
