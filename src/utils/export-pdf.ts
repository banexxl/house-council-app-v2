import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportToPdf = async (filename: string, data: any[]) => {
     if (!data || data.length === 0) {
          console.error("No data available to export.");
          return;
     }

     const doc = new jsPDF();

     // Define column widths (40% for key, 60% for value)
     const columnWidths = [40, 60];

     data.forEach((client, index) => {
          // Add an empty row between tables if it's not the first client
          if (index > 0) {
               doc.addPage();
          }

          const clientName = client.name || "Unknown Client"; // Get the client's name

          // Add client name as header
          doc.setFontSize(16);
          doc.text(clientName, 20, 20); // Position client name at the top
          doc.setFontSize(12); // Reset font size for the table

          // Prepare the data for the table (key-value pairs)
          const tableData = Object.entries(client)
               .filter(([key]) => key !== "name") // Exclude the "name" field
               .map(([key, value]) => [key, String(value || "")]); // Convert value to string

          // Add the table
          autoTable(doc, {
               startY: 30, // Position the table below the client name
               head: [["Field", "Value"]],
               body: tableData,
               columnStyles: {
                    0: { cellWidth: columnWidths[0] }, // Key column width (40%)
                    1: { cellWidth: columnWidths[2] }, // Value column width (60%)
               },
               theme: "striped", // Optional: adds alternating row colors
          });
     });

     // Save the PDF file
     doc.save(`${filename}.pdf`);
};
