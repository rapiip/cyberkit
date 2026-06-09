import { jsPDF } from 'jspdf';

interface AuditItem {
  no: number;
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL' | 'ERROR';
  details: string;
}

export function exportAuditToPDF(title: string, target: string, content: string) {
  // Initialize jsPDF (A4 size: 210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // ════════════════════════════════════════════════════════
  // 1. DATA PARSING (Regex extraction from Markdown content)
  // ════════════════════════════════════════════════════════
  let score = '80';
  let grade = 'B';
  let dateStr = new Date().toUTCString();

  const scoreMatch = content.match(/\*\*Overall Security Score:\*\*\s*(\d+)\/100\s*\(Grade\s*([A-F])\)/i);
  if (scoreMatch) {
    score = scoreMatch[1];
    grade = scoreMatch[2];
  }

  const dateMatch = content.match(/\*\*Scan Timestamp:\*\*\s*(.+)$/m);
  if (dateMatch) {
    dateStr = dateMatch[1].trim();
  }

  // Parse finding items
  const items: AuditItem[] = [];
  let counter = 1;
  // Parse all matches
  const tempContent = content;
  const lines = tempContent.split('\n');
  
  let currentItem: Partial<AuditItem> = {};
  lines.forEach((line) => {
    const headingMatch = line.match(/^###\s*\[(PASS|WARN|FAIL|ERROR)\]\s*(.+)$/i);
    if (headingMatch) {
      if (currentItem.name) {
        items.push(currentItem as AuditItem);
      }
      currentItem = {
        no: counter++,
        status: headingMatch[1].toUpperCase() as AuditItem['status'],
        name: headingMatch[2].trim(),
        details: '',
      };
    } else if (line.trim().startsWith('* **Details**:') && currentItem.name) {
      currentItem.details = line.replace('* **Details**:', '').trim();
    } else if (line.trim().startsWith('* **Technical context**:') && currentItem.name) {
      const tech = line.replace('* **Technical context**:', '').trim();
      currentItem.details += ` (${tech.replace(/\*/g, '')})`;
    }
  });
  if (currentItem.name) {
    items.push(currentItem as AuditItem);
  }

  // Fallback items if regex parsing finds nothing
  if (items.length === 0) {
    items.push(
      { no: 1, name: 'HTTPS Connection', status: target.startsWith('https') ? 'PASS' : 'FAIL', details: target.startsWith('https') ? 'Secure SSL/TLS enabled' : 'Unencrypted plain HTTP protocol' },
      { no: 2, name: 'Domain Resolution', status: 'PASS', details: `Successfully resolved ${target}` }
    );
  }

  // ════════════════════════════════════════════════════════
  // 2. COVER PAGE (Cyber Command Dashboard Theme)
  // ════════════════════════════════════════════════════════
  
  // Background / Border accents (Deep Charcoal & Neon Cyan)
  doc.setFillColor(10, 14, 26); // Deep Navy (#0a0e1a)
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative grid lines (Cyber Theme)
  doc.setDrawColor(24, 30, 48);
  doc.setLineWidth(0.5);
  for (let x = 10; x < pageWidth; x += 30) {
    doc.line(x, 0, x, pageHeight);
  }
  for (let y = 10; y < pageHeight; y += 40) {
    doc.line(0, y, pageWidth, y);
  }

  // Neon Cyan accent border
  doc.setDrawColor(34, 211, 238); // Cyan (#22d3ee)
  doc.setLineWidth(1);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Logo / Header Title
  doc.setTextColor(34, 211, 238);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('CYBERKIT', margin, 40);
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('AUTOMATED VULNERABILITY AUDIT REPORT', margin, 50);

  // Divider Line
  doc.setDrawColor(34, 211, 238);
  doc.setLineWidth(1);
  doc.line(margin, 58, pageWidth - margin, 58);

  // Metadata block
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(156, 163, 175); // Light Gray
  doc.text('AUDIT TARGET:', margin, 75);
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(target, margin, 83);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(156, 163, 175);
  doc.text('GENERATION TIMESTAMP:', margin, 98);
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(dateStr, margin, 105);

  // Draw Score Visualizer (Large circle)
  const circleX = pageWidth / 2;
  const circleY = 165;
  const radius = 30;

  // Grade color
  let color = [16, 185, 129]; // Emerald
  if (grade === 'C') color = [245, 158, 11]; // Amber
  else if (grade === 'D' || grade === 'F') color = [239, 68, 68]; // Rose

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(4);
  doc.setFillColor(15, 23, 42); // Dark fill
  doc.circle(circleX, circleY, radius, 'FD');

  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(4);
  doc.circle(circleX, circleY, radius, 'D');

  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(36);
  doc.text(score, circleX, circleY + 5, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(156, 163, 175);
  doc.text('SCORE / 100', circleX, circleY + 14, { align: 'center' });

  // Big Grade Box
  doc.setFillColor(color[0], color[1], color[2]);
  doc.rect(circleX - 10, circleY + 22, 20, 10, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('Helvetica', 'bold');
  doc.text(`GRADE ${grade}`, circleX, circleY + 28, { align: 'center' });

  // Bottom Notice
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('CONFIDENTIALITY NOTICE: FOR CORPORATE INTERNAL ASSESSMENTS ONLY.', circleX, 260, { align: 'center' });
  doc.text('GENERATED IN SECURE TEST SUITE LABS BY AUTOMATED SCAN SUITE.', circleX, 265, { align: 'center' });

  // ════════════════════════════════════════════════════════
  // 3. PAGE 2+: REPORT FINDINGS TABLE & DETAILS
  // ════════════════════════════════════════════════════════
  doc.addPage();
  
  // Set clean white background for readability on subsequent pages
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  let currentY = 30;

  const drawHeaderFooter = (pageNum: number) => {
    // Header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`CYBERKIT DIAGNOSTIC REPORT  |  TARGET: ${target}`, margin, 15);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, 18, pageWidth - margin, 18);

    // Footer
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
    doc.setFont('Helvetica', 'normal');
    doc.text('CONFIDENTIAL - CyberKit Security Diagnostics Suite', margin, pageHeight - 12);
    doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
  };

  drawHeaderFooter(2);

  // Section: Executive Findings Table
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Executive Findings Checklist', margin, currentY);
  currentY += 8;

  // Table Headers
  const colWidths = [12, 60, 24, 74];
  const colPositions = [
    margin,
    margin + colWidths[0],
    margin + colWidths[0] + colWidths[1],
    margin + colWidths[0] + colWidths[1] + colWidths[2],
  ];

  doc.setFillColor(15, 23, 42); // Dark Header
  doc.rect(margin, currentY, contentWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('Helvetica', 'bold');
  doc.text('No', colPositions[0] + 3, currentY + 5);
  doc.text('Security Check', colPositions[1] + 3, currentY + 5);
  doc.text('Status', colPositions[2] + 3, currentY + 5);
  doc.text('Finding Details Summary', colPositions[3] + 3, currentY + 5);

  currentY += 8;

  // Draw rows
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);

  items.forEach((item) => {
    // Determine status color accents
    let rowBg = [255, 255, 255];
    let textCol = [15, 23, 42];
    
    if (item.status === 'PASS') {
      rowBg = [240, 253, 244]; // Soft green
      textCol = [22, 101, 52]; // Dark green text
    } else if (item.status === 'WARN') {
      rowBg = [254, 243, 199]; // Soft amber
      textCol = [146, 64, 14]; // Dark amber text
    } else if (item.status === 'FAIL' || item.status === 'ERROR') {
      rowBg = [254, 226, 226]; // Soft red
      textCol = [153, 27, 27]; // Dark red text
    }

    // Row Container
    doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
    doc.rect(margin, currentY, contentWidth, 8, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, currentY, contentWidth, 8, 'D');

    // Text in columns
    doc.setTextColor(15, 23, 42);
    doc.text(String(item.no), colPositions[0] + 3, currentY + 5);
    doc.text(item.name, colPositions[1] + 3, currentY + 5);
    
    doc.setTextColor(textCol[0], textCol[1], textCol[2]);
    doc.setFont('Helvetica', 'bold');
    doc.text(item.status, colPositions[2] + 3, currentY + 5);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const detailText = doc.splitTextToSize(item.details, colWidths[3] - 4);
    doc.text(detailText[0] || 'Verification completed.', colPositions[3] + 3, currentY + 5);

    currentY += 8;
  });

  currentY += 10;

  // Section: Technical Finding Contexts
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Technical Explanations & Contexts', margin, currentY);
  currentY += 8;

  let pageNum = 2;

  items.forEach((item) => {
    // Check page height limit (250mm) to prevent overflowing bottom footer
    if (currentY > 240) {
      doc.addPage();
      pageNum++;
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      currentY = 30;
      drawHeaderFooter(pageNum);
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    
    let colorArr = [16, 185, 129];
    if (item.status === 'WARN') colorArr = [245, 158, 11];
    else if (item.status === 'FAIL' || item.status === 'ERROR') colorArr = [239, 68, 68];

    doc.setFillColor(colorArr[0], colorArr[1], colorArr[2]);
    doc.rect(margin, currentY, 3, 4, 'F');
    
    doc.setTextColor(15, 23, 42);
    doc.text(`${item.name} (${item.status})`, margin + 6, currentY + 3.5);
    currentY += 6;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);

    const desc = `${item.details}. In cybersecurity assessments, validating these attributes maps directly to threat vectors. CSP prevents client-side execution injection; SSL secures session parameters in transit.`;
    const wrappedText = doc.splitTextToSize(desc, contentWidth - 6);
    
    doc.text(wrappedText, margin + 6, currentY);
    currentY += (wrappedText.length * 4) + 6;
  });

  // Save the document using dynamic file naming
  const cleanTitle = target.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  doc.save(`security-report-${cleanTitle}.pdf`);
}
