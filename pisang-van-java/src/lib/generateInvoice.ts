import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import dayjs from 'dayjs'
import 'dayjs/locale/id'

export const generateInvoicePDF = (order: any) => {
  const doc = new jsPDF()

  // Header PVJ
  doc.setFontSize(22)
  doc.setTextColor(212, 128, 42) // #D4802A
  doc.text('PISANG VAN JAVA', 14, 22)
  
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text('Platform Kuliner Tradisional Modern', 14, 28)
  
  // Invoice Title
  doc.setFontSize(16)
  doc.setTextColor(40)
  doc.text('INVOICE / STRUK PEMBELIAN', 14, 42)
  
  // Order Info
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Order ID: ${order.id}`, 14, 50)
  doc.text(`Tanggal: ${dayjs(order.createdAt).locale('id').format('DD MMMM YYYY, HH:mm')}`, 14, 56)
  doc.text(`Status: ${order.status}`, 14, 62)
  
  // Customer Info
  doc.text(`Nama Pelanggan: ${order.customerName || '-'}`, 120, 50)
  doc.text(`No. HP: ${order.customerPhone || '-'}`, 120, 56)
  doc.text(`Metode Kirim: ${order.deliveryMethod}`, 120, 62)
  doc.text(`Pembayaran: ${order.payment?.paymentType || 'Belum dipilih'}`, 120, 68)

  // Table Data Preparation
  const tableData = order.items.map((item: any, index: number) => {
    const toppings = item.toppings?.length > 0 
      ? item.toppings.map((t: any) => t.name).join(', ') 
      : '-'
      
    const desc = `${item.variant?.flavorName || 'Menu Terhapus'} (${item.baseType})\nTopping: ${toppings}`
    
    return [
      index + 1,
      desc,
      `${item.quantity}x`,
      `Rp ${new Intl.NumberFormat('id-ID').format(item.unitPrice)}`,
      `Rp ${new Intl.NumberFormat('id-ID').format(item.subtotal)}`
    ]
  })

  // Render Table
  autoTable(doc, {
    startY: 75,
    head: [['No', 'Deskripsi Produk', 'Qty', 'Harga Satuan', 'Subtotal']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [212, 128, 42], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 15, halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' }
    }
  })

  // Billing Summary
  const finalY = (doc as any).lastAutoTable.finalY + 10
  
  doc.setFont('helvetica', 'normal')
  doc.text(`Subtotal Produk: Rp ${new Intl.NumberFormat('id-ID').format(order.totalPrice - order.deliveryFee + order.discountAmount)}`, 130, finalY)
  doc.text(`Ongkos Kirim: Rp ${new Intl.NumberFormat('id-ID').format(order.deliveryFee)}`, 130, finalY + 6)
  
  if (order.discountAmount > 0) {
    doc.setTextColor(220, 38, 38)
    doc.text(`Diskon Voucher: -Rp ${new Intl.NumberFormat('id-ID').format(order.discountAmount)}`, 130, finalY + 12)
    doc.setTextColor(40)
  }
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  const totalY = order.discountAmount > 0 ? finalY + 22 : finalY + 16
  
  doc.setDrawColor(200)
  doc.line(130, totalY - 5, 196, totalY - 5)
  doc.text(`TOTAL BAYAR: Rp ${new Intl.NumberFormat('id-ID').format(order.totalPrice)}`, 130, totalY)

  // Footer
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(150)
  doc.text('Terima kasih telah berbelanja di Pisang Goreng Van Java.', 14, 280)
  doc.text('Invoice ini di-generate secara otomatis dan sah.', 14, 284)

  // Trigger Download
  doc.save(`Invoice_PVJ_${order.id}.pdf`)
}
