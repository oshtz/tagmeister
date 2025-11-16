export class GeminiService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateImageCaption(
    imagePath: string,
    model: string,
    promptText: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const normalizedModel = model.startsWith('models/')
      ? model
      : `models/${model}`;

    const { base64Data, mimeType } = await this.getBase64FromImagePath(imagePath);

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType,
                data: base64Data
              }
            }
          ]
        }
      ]
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${normalizedModel}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const parts: string[] = Array.isArray(data?.candidates?.[0]?.content?.parts)
      ? data.candidates[0].content.parts
          .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
          .filter(Boolean)
      : [];

    const combinedText = parts.join(' ').trim();
    if (!combinedText) {
      throw new Error('No content returned from Gemini API');
    }

    if (onChunk) {
      onChunk(combinedText);
    }

    return combinedText;
  }

  private async getBase64FromImagePath(imagePath: string): Promise<{ base64Data: string; mimeType: string }> {
    try {
      const fs = await import('@tauri-apps/plugin-fs');
      const binaryData = await fs.readFile(imagePath);
      return {
        base64Data: this.arrayBufferToBase64(binaryData),
        mimeType: this.getMimeType(imagePath)
      };
    } catch (error) {
      console.error('Error reading image for Gemini:', error);
      throw new Error(`Failed to read image file for Gemini: ${error}`);
    }
  }

  private getMimeType(path: string): string {
    const extension = path.toLowerCase().split('.').pop() || '';
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }

  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
