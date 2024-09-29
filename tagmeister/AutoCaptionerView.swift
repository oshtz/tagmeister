import SwiftUI
import Foundation

struct AutoCaptionerView: View {
    @Binding var selectedImages: Set<URL>
    @Binding var selectedImage: URL?
    @Binding var currentImageIndex: Int
    @Binding var imageTags: [String]
    @Binding var isGenerating: Bool
    @Binding var captionText: String
    @Binding var apiKey: String
    @Binding var selectedModel: String
    
    @State private var showConfirmationDialog: Bool = false
    @State private var progress: Float = 0.0
    
    @Binding var prependText: String
    @Binding var appendText: String
    
    var saveCaptionToFile: (URL?, String) -> Void
    
    var body: some View {
        VStack(alignment: .center) {
            Text("Auto-Captioner").font(.headline)
            
            Button(action: {
                if selectedImages.count > 1 {
                    showConfirmationDialog = true
                } else {
                    startAutoCaptioning()
                }
            }) {
                Text(isGenerating ? "Generating..." : "Start Auto-Captioning")
            }
            .disabled(selectedImages.isEmpty || isGenerating || apiKey.isEmpty)
            
            if isGenerating {
                ProgressView(value: progress)
            }
        }
        .padding(5)
        .confirmationDialog(
            "Caption multiple images?",
            isPresented: $showConfirmationDialog,
            actions: {
                Button("Yes") {
                    startAutoCaptioning()
                }
                Button("No", role: .cancel) {}
            },
            message: {
                Text("Are you sure you want to caption \(selectedImages.count) images?")
            }
        )
    }
    
    private func startAutoCaptioning() {
        isGenerating = true
        progress = 0.0
        let sortedImages = selectedImages.sorted { $0.lastPathComponent.localizedStandardCompare($1.lastPathComponent) == .orderedAscending }
        captionImagesSequentially(images: sortedImages, currentIndex: 0)
    }
    
    private func captionImagesSequentially(images: [URL], currentIndex: Int) {
        guard currentIndex < images.count else {
            isGenerating = false
            progress = 1.0
            return
        }

        let currentImage = images[currentIndex]
        selectedImage = currentImage
        self.currentImageIndex = currentIndex

        analyzeImage(at: currentImage, apiKey: apiKey, model: selectedModel) { caption in
            DispatchQueue.main.async {
                let processedCaption = self.processCaption(caption)
                self.captionText = self.prependText + processedCaption + self.appendText
                self.saveCaptionToFile(currentImage, self.captionText)
                self.progress = Float(currentIndex + 1) / Float(images.count)
                self.captionImagesSequentially(images: images, currentIndex: currentIndex + 1)
            }
        }
    }
    
    private func processCaption(_ caption: String) -> String {
        var processedCaption = caption.trimmingCharacters(in: .whitespacesAndNewlines)

        let prefixesToRemove = [""];
        for prefix in prefixesToRemove {
            if processedCaption.lowercased().hasPrefix(prefix.lowercased()) {
                let index = processedCaption.index(processedCaption.startIndex, offsetBy: prefix.count)
                processedCaption = String(processedCaption[index...]).trimmingCharacters(in: .whitespaces)
                break
            }
        }

        // Replace periods with commas, except for the last one
        let components = processedCaption.components(separatedBy: ".")
        processedCaption = components.enumerated().map { index, component in
            let trimmed = component.trimmingCharacters(in: .whitespaces)
            return index == components.count - 1 ? trimmed : trimmed + ","
        }.joined(separator: " ")

        return processedCaption.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    
    func analyzeImage(at url: URL, apiKey: String, model: String, completion: @escaping (String) -> Void) {
        // Convert the image to Data and then to a base64 string
        guard let imageData = try? Data(contentsOf: url) else {
            completion("Failed to load image data.")
            return
        }
        
        let base64Image = imageData.base64EncodedString(options: .endLineWithLineFeed)
        
        // Prepare the request payload
        let payload: [String: Any] = [
            "model": model,
            "messages": [
                [
                    "role": "user",
                    "content": [
                        [
                            "type": "text",
                            "text": "Describe this image in one concise paragraph, starting immediately with the primary subject (e.g., 'A watch,' 'A landscape,' 'A person'). Focus on key elements, their relationships, and notable details. Be specific and direct, avoiding any introductory phrases like 'The image shows' or 'I can see.' Prioritize the most important aspects and describe them factually. Identify the main subject quickly and accurately, noting its dominant characteristics such as size, color, shape, or position. For multiple elements, describe their spatial relationships. Include relevant details about composition, color schemes, lighting, and textures. Mention any actions, movements, functions, or unique features of objects, and appearances or behaviors of people or animals. Include any visible text, logos, or recognizable symbols. Describe what you see literally, without interpreting the image's style (e.g., don't use terms like 'stylized,' 'illustration,' or mention artistic techniques). Treat every subject as a real object or scene, not as a representation. Use varied and precise vocabulary to create a vivid description while maintaining a neutral tone. Avoid subjective interpretations unless crucial to understanding the image's content."
                        ],
                        [
                            "type": "image_url",
                            "image_url": [
                                "url": "data:image/jpeg;base64,\(base64Image)"
                            ]
                        ]
                    ]
                ]
            ],
            "max_tokens": 300
        ]
        
        // Serialize the request body to JSON data
        guard let requestData = try? JSONSerialization.data(withJSONObject: payload) else {
            completion("Failed to create request.")
            return
        }
        
        // Set up the request
        var request = URLRequest(url: URL(string: "https://api.openai.com/v1/chat/completions")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.httpBody = requestData
        
        // Send the request and handle the response
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            guard let data = data, error == nil else {
                completion("Error: \(error?.localizedDescription ?? "Unknown error")")
                return
            }
            
            // Handle the JSON response and extract the content
            do {
                if let json = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
                   let choices = json["choices"] as? [[String: Any]],
                   let message = choices.first?["message"] as? [String: Any],
                   let caption = message["content"] as? String {
                    
                    DispatchQueue.main.async {
                        completion(caption)
                    }
                    
                } else {
                    if let jsonString = String(data: data, encoding: .utf8) {
                        print("Full JSON response: \(jsonString)")
                    }
                    DispatchQueue.main.async {
                        completion("Failed to parse response.")
                    }
                }
            } catch {
                if let jsonString = String(data: data, encoding: .utf8) {
                    print("Full JSON response: \(jsonString)")
                }
                DispatchQueue.main.async {
                    completion("Error parsing JSON: \(error.localizedDescription)")
                }
            }
        }
        
        task.resume()
    }
}
