import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

export interface CertificateDetails {
  participantName: string;
  roundTitle: string;
  issuedAt: string;
  verificationUrl: string;
  publicCode: string;
}

export async function renderCertificate(details: CertificateDetails): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const page = document.addPage([842, 595]);
  const titleFont = await document.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await document.embedFont(StandardFonts.Helvetica);
  const qrDataUrl = await QRCode.toDataURL(details.verificationUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 260,
  });
  const qrBytes = Uint8Array.from(atob(qrDataUrl.split(',')[1]), (character) =>
    character.charCodeAt(0),
  );
  const qr = await document.embedPng(qrBytes);

  page.drawRectangle({
    x: 24,
    y: 24,
    width: 794,
    height: 547,
    borderWidth: 3,
    borderColor: rgb(0.08, 0.45, 0.52),
  });
  drawCentred(page, 'GHRU Puzzles', titleFont, 28, 510);
  drawCentred(page, 'Certificate of Genomic Analysis Proficiency', titleFont, 22, 455);
  drawCentred(page, 'This certifies that', bodyFont, 14, 405);
  drawCentred(page, details.participantName, titleFont, 26, 360);
  drawCentred(
    page,
    `successfully completed all four challenge modules in ${details.roundTitle}`,
    bodyFont,
    14,
    318,
  );
  page.drawText(`Issued: ${new Date(details.issuedAt).toLocaleDateString('en-GB')}`, {
    x: 80,
    y: 100,
    size: 11,
    font: bodyFont,
  });
  page.drawText(`Credential: ${details.publicCode}`, {
    x: 80,
    y: 80,
    size: 9,
    font: bodyFont,
  });
  page.drawImage(qr, { x: 660, y: 55, width: 115, height: 115 });
  return document.save();
}

function drawCentred(
  page: ReturnType<PDFDocument['addPage']>,
  text: string,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  size: number,
  y: number,
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (page.getWidth() - width) / 2, y, size, font });
}
