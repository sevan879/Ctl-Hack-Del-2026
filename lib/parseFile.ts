import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export async function parseFile(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const ext = filename.toLowerCase().split(".").pop();

  switch (ext) {
    case "pdf": {
      const data = await pdfParse(buffer);
      return data.text;
    }
    case "docx": {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    case "txt": {
      return buffer.toString("utf-8");
    }
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
}
