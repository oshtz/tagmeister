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

        // Remove "The image features/depicts/shows..." text more aggressively
        let prefixesToRemove = ["The image features", "The image depicts", "The image shows", "This image depicts", "This image shows", "This image features", "The image appears to depict", "This image appears to depict", "This image is", "The image is", "The photo shows", "The photo depicts", "The photo features", "This photo shows", "This photo depicts", "This photo features", "The picture shows", "The picture depicts", "The picture features", "This picture shows", "This picture depicts", "This picture features", "The scene shows", "The scene depicts", "This scene shows", "This scene depicts", "I see", "I can see", "We can see", "The image contains", "This image contains", "The photo contains", "This photo contains", "The picture contains", "This picture contains", "Visible in the image is", "Visible in the photo is", "Visible in the picture is", "The image displays", "This image displays", "The photo displays", "This photo displays", "The picture displays", "This picture displays", "In this image,", "In this photo,", "In this picture,", "The image presents", "This image presents", "The photo presents", "This photo presents", "The picture presents", "This picture presents", "The image portrays", "This image portrays", "The photo portrays", "This photo portrays", "The picture portrays", "This picture portrays", "The image illustrates", "This image illustrates", "The photo illustrates", "This photo illustrates", "The picture illustrates", "This picture illustrates", "The image captures", "This image captures", "The photo captures", "This photo captures", "The picture captures", "This picture captures", "The image reveals", "This image reveals", "The photo reveals", "This photo reveals", "The picture reveals", "This picture reveals", "The image showcases", "This image showcases", "The photo showcases", "This photo showcases", "The picture showcases", "This picture showcases", "The image demonstrates", "This image demonstrates", "The photo demonstrates", "This photo demonstrates", "The picture demonstrates", "This picture demonstrates", "The image represents", "This image represents", "The photo represents", "This photo represents", "The picture represents", "This picture represents", "The image conveys", "This image conveys", "The photo conveys", "This photo conveys", "The picture conveys", "This picture conveys", "What I see is", "What we can see is", "The image appears to show", "The photo appears to show", "The picture appears to show", "This image appears to show", "This photo appears to show", "This picture appears to show"];
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
                            "text": "What's in this image?"
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
