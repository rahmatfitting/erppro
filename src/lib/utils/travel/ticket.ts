import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export const generateTicketPDF = (booking: any) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a5", // Smaller ticket size
  });

  // Header
  doc.setFillColor(99, 102, 241); // Indigo-600
  doc.rect(0, 0, 148, 30, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("ERP PRO TRAVEL", 74, 15, { align: "center" });
  doc.setFontSize(10);
  doc.text("Electronic Ticket / E-Ticket", 74, 22, { align: "center" });

  // Booking Info
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(12);
  doc.text("BOOKING CODE", 10, 45);
  doc.setFontSize(16);
  doc.setTextColor(99, 102, 241);
  doc.text(booking.code, 10, 52);

  doc.setTextColor(50, 50, 50);
  doc.setFontSize(10);
  doc.text(`Issued at: ${format(new Date(), "dd MMM yyyy, HH:mm")}`, 10, 58);

  // Trip Info
  doc.setDrawColor(230, 230, 230);
  doc.line(10, 65, 138, 65);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`${booking.schedule.route.origin}`, 10, 75);
  doc.text(`${booking.schedule.route.destination}`, 138, 75, { align: "right" });
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("ORIGIN", 10, 79);
  doc.text("DESTINATION", 138, 79, { align: "right" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(format(new Date(booking.schedule.departure), "dd MMM yyyy"), 10, 90);
  doc.text(format(new Date(booking.schedule.departure), "HH:mm"), 138, 90, { align: "right" });

  // Passenger Info
  autoTable(doc, {
    startY: 100,
    head: [['Passenger', 'Seat', 'Status']],
    body: [
      [booking.customer.name, booking.details.map((d: any) => d.seatNumber).join(', '), booking.status]
    ],
    theme: 'striped',
    headStyles: { fillColor: [99, 102, 241] },
    styles: { fontSize: 9 }
  });

  // Footer / Instructions
  const finalY = (doc as any).lastAutoTable.finalY || 120;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Important Instructions:", 10, finalY + 10);
  doc.text("- Please arrive 30 minutes before departure.", 10, finalY + 15);
  doc.text("- Bring this E-Ticket and your ID (KTP/SIM).", 10, finalY + 20);
  doc.text("- Tickets are non-refundable after departure.", 10, finalY + 25);

  // QR Code placeholder
  doc.rect(110, finalY + 10, 25, 25);
  doc.setFontSize(6);
  doc.text("QR SCAN", 122.5, finalY + 38, { align: "center" });

  doc.save(`Ticket-${booking.code}.pdf`);
};
