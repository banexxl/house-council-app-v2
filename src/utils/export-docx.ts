import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType } from "docx";

export const exportToDocx = async (filename: string, data: any[]) => {
     if (!data || data.length === 0) {
          console.error("No data available to export.");
          return;
     }

     const sections = data.map((client) => {
          const clientName = client.name || "Unknown Client"; // Header for the client's name
          const clientDetails = Object.entries(client)
               .filter(([key]) => key !== "name") // Exclude the "name" field from details
               .map(([key, value]) =>
                    new TableRow({
                         children: [
                              new TableCell({
                                   children: [new Paragraph(key)],
                                   width: {
                                        size: 4080, // 1/3 of total width (12240 twips)
                                        type: WidthType.DXA,
                                   },
                              }),
                              new TableCell({
                                   children: [new Paragraph(String(value || ""))],
                                   width: {
                                        size: 8160, // 2/3 of total width (12240 twips)
                                        type: WidthType.DXA,
                                   },
                              }),
                         ],
                    })
               );

          const table = new Table({
               rows: [
                    // Table header row
                    new TableRow({
                         children: [
                              new TableCell({
                                   children: [new Paragraph("Field")],
                                   width: {
                                        size: 4080, // 1/3 of total width
                                        type: WidthType.DXA,
                                   },
                              }),
                              new TableCell({
                                   children: [new Paragraph("Value")],
                                   width: {
                                        size: 8160, // 2/3 of total width
                                        type: WidthType.DXA,
                                   },
                              }),
                         ],
                    }),
                    ...clientDetails,
               ],
          });

          return [
               new Paragraph({
                    text: clientName,
                    heading: "Heading1",
               }),
               table,
          ];
     });

     const doc = new Document({
          sections: [
               {
                    children: sections.flat(), // Combine all tables into the document
               },
          ],
     });

     const blob = await Packer.toBlob(doc);

     const link = document.createElement("a");
     link.href = URL.createObjectURL(blob);
     link.download = `${filename}.docx`;
     link.click();
};
