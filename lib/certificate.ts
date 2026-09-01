import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

export interface CertificateDetails {
  participantName: string;
  roundTitle: string;
  issuedAt: string;
  verificationUrl: string;
  publicCode: string;
}

export function createCertificatePublicCode(): string {
  const random = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...random))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

export function certificateVerificationUrl(baseUrl: string, publicCode: string): string {
  return `${baseUrl.replace(/\/$/, '')}/verify/${publicCode}`;
}

export async function renderCertificate(details: CertificateDetails): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const page = document.addPage([842, 595]);
  const titleFont = await document.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await document.embedFont(StandardFonts.Helvetica);
  const navy = rgb(0.04, 0.09, 0.16);
  const teal = rgb(0.04, 0.58, 0.52);
  const darkTeal = rgb(0.03, 0.39, 0.38);
  const mint = rgb(0.91, 0.98, 0.96);
  const slate = rgb(0.32, 0.39, 0.47);
  const pale = rgb(0.97, 0.98, 0.99);
  const qrDataUrl = await QRCode.toDataURL(details.verificationUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 260,
  });
  const qrBytes = Uint8Array.from(atob(qrDataUrl.split(',')[1]), (character) =>
    character.charCodeAt(0),
  );
  const qr = await document.embedPng(qrBytes);

  page.drawRectangle({ x: 0, y: 0, width: 842, height: 595, color: pale });
  page.drawRectangle({ x: 0, y: 0, width: 18, height: 595, color: navy });
  page.drawCircle({ x: 818, y: 560, size: 125, color: teal, opacity: 0.08 });
  page.drawCircle({ x: 792, y: 536, size: 68, color: teal, opacity: 0.08 });
  page.drawRectangle({
    x: 34,
    y: 28,
    width: 780,
    height: 539,
    borderWidth: 1.5,
    borderColor: teal,
  });

  drawPuzzleMark(page, 62, 514, teal, darkTeal);
  page.drawText('GHRUPUZZLES', { x: 102, y: 530, size: 18, font: titleFont, color: navy });
  page.drawText('MICROBIAL GENOME BENCHMARKING EXERCISES', {
    x: 102,
    y: 515,
    size: 8,
    font: titleFont,
    color: darkTeal,
  });

  page.drawText('CERTIFICATE', {
    x: 62,
    y: 462,
    size: 12,
    font: titleFont,
    color: darkTeal,
  });
  page.drawText('OF PARTICIPATION', { x: 62, y: 425, size: 31, font: titleFont, color: navy });
  page.drawRectangle({ x: 62, y: 405, width: 92, height: 4, color: teal });

  page.drawText('PRESENTED TO', {
    x: 62,
    y: 374,
    size: 9,
    font: titleFont,
    color: slate,
  });
  drawFittedText(page, details.participantName, titleFont, 28, 62, 340, 575, navy);
  page.drawText(`For participating in and completing all four exercises in ${details.roundTitle}.`, {
    x: 62,
    y: 309,
    size: 13,
    font: bodyFont,
    color: navy,
  });
  page.drawText('A practical microbial genomics challenge using simulated datasets across four areas:', {
    x: 62,
    y: 284,
    size: 11,
    font: bodyFont,
    color: slate,
  });

  const areas = ['Sequence typing', 'Short-read assembly', 'Hybrid assembly', 'Outbreak investigation'];
  const areaWidths = [138, 158, 138, 164];
  let areaX = 62;
  for (let index = 0; index < areas.length; index += 1) {
    const width = areaWidths[index];
    page.drawRectangle({ x: areaX, y: 228, width, height: 36, color: mint, borderColor: teal, borderWidth: 0.8 });
    drawCentredWithin(page, areas[index], titleFont, 9.5, areaX, width, 241, darkTeal);
    areaX += width + 12;
  }

  page.drawRectangle({ x: 62, y: 192, width: 708, height: 1, color: teal, opacity: 0.35 });
  page.drawText('ISSUED', { x: 62, y: 157, size: 8, font: titleFont, color: slate });
  page.drawText(new Date(details.issuedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }), { x: 62, y: 137, size: 12, font: titleFont, color: navy });
  page.drawText('CREDENTIAL ID', { x: 62, y: 106, size: 8, font: titleFont, color: slate });
  page.drawText(details.publicCode, { x: 62, y: 87, size: 9, font: bodyFont, color: navy });
  page.drawText('Issued by GHRUPUZZLES', { x: 310, y: 137, size: 11, font: titleFont, color: navy });
  page.drawText('A public record can be checked using the QR code.', { x: 310, y: 117, size: 9.5, font: bodyFont, color: slate });

  page.drawRectangle({ x: 674, y: 60, width: 112, height: 112, color: rgb(1, 1, 1), borderColor: teal, borderWidth: 1 });
  page.drawImage(qr, { x: 681, y: 67, width: 98, height: 98 });
  drawCentredWithin(page, 'SCAN TO VERIFY', titleFont, 7.5, 674, 112, 47, darkTeal);
  return document.save();
}

function drawPuzzleMark(
  page: ReturnType<PDFDocument['addPage']>,
  x: number,
  y: number,
  teal: ReturnType<typeof rgb>,
  darkTeal: ReturnType<typeof rgb>,
) {
  page.drawRectangle({ x, y, width: 15, height: 15, color: teal });
  page.drawRectangle({ x: x + 17, y, width: 15, height: 15, color: darkTeal });
  page.drawRectangle({ x, y: y + 17, width: 15, height: 15, color: darkTeal });
  page.drawRectangle({ x: x + 17, y: y + 17, width: 15, height: 15, color: teal });
  page.drawCircle({ x: x + 16, y: y + 16, size: 5, color: paleBackground });
}

const paleBackground = rgb(0.97, 0.98, 0.99);

function drawFittedText(
  page: ReturnType<PDFDocument['addPage']>,
  text: string,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  preferredSize: number,
  x: number,
  y: number,
  maxWidth: number,
  color: ReturnType<typeof rgb>,
) {
  let size = preferredSize;
  while (size > 17 && font.widthOfTextAtSize(text, size) > maxWidth) size -= 1;
  page.drawText(text, { x, y, size, font, color });
}

function drawCentredWithin(
  page: ReturnType<PDFDocument['addPage']>,
  text: string,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  size: number,
  x: number,
  width: number,
  y: number,
  color: ReturnType<typeof rgb>,
) {
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: x + (width - textWidth) / 2, y, size, font, color });
}
