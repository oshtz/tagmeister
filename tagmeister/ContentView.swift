import SwiftUI
import Foundation
import AppKit

struct CustomListStyle: ViewModifier {
    @Environment(\.colorScheme) var colorScheme
    
    func body(content: Content) -> some View {
        content
            .listStyle(PlainListStyle())
            .environment(\.defaultMinListRowHeight, 1)
            .background(colorScheme == .dark ? Color.black : Color.white.opacity(0.1))
    }
}

extension View {
    func customListStyle() -> some View {
        self.modifier(CustomListStyle())
    }
}

struct TooltipView: View {
    let text: String
    
    var body: some View {
        Text(text)
            .padding(5)
            .background(Color.black.opacity(0.7))
            .foregroundColor(.white)
            .cornerRadius(5)
            .fixedSize(horizontal: true, vertical: false)
    }
}

struct TooltipModifier: ViewModifier {
    let tooltip: String
    var customXOffset: CGFloat = 0 // Default to 0, no shift unless specified
    @State private var isShowing = false

    func body(content: Content) -> some View {
        content
            .overlay(
                Group {
                    if isShowing {
                        TooltipView(text: tooltip)
                            .offset(x: customXOffset, y: 30) // Only apply custom X offset
                            .transition(.opacity)
                            .animation(.easeInOut(duration: 0.2), value: isShowing)
                    }
                },
                alignment: .bottomLeading
            )
            .onHover { hovering in
                withAnimation {
                    isShowing = hovering
                }
            }
    }
}

extension View {
    func tooltip(_ text: String, customXOffset: CGFloat = 0) -> some View {
        self.modifier(TooltipModifier(tooltip: text, customXOffset: customXOffset))
    }
}

struct ContentView: View {
    @State private var selectedDirectory: URL? = nil
    @State private var images: [URL] = []
    @State private var selectedImage: URL? = nil
    @State private var selectedImages: Set<URL> = []
    @State private var currentImageIndex: Int = 0
    @State private var imageTags: [String] = []
    @State private var isGenerating: Bool = false
    @State private var captionText: String = ""
    @State private var fontSize: Int = 16

    // To track the current appearance
    @State private var isDarkMode: Bool = false
    
    @AppStorage("apiKey") private var apiKey: String = ""
    @State private var isEditingApiKey: Bool = false
    @State private var selectedModel: String = "gpt-4o-mini"

    @State private var leftSidebarWidth: CGFloat = 350
    @State private var rightSidebarWidth: CGFloat = 350

    @State private var prependText: String = ""
    @State private var appendText: String = ""

    let models = ["gpt-4o-mini", "gpt-4o", "gpt-4o-turbo"]

    var body: some View {
        HStack(spacing: 0) {
            // Left Sidebar for Image List
            VStack(spacing: 10) {
                HStack(spacing: 5) {
                    Button(action: selectDirectory) {
                        Image(systemName: "folder.badge.plus")
                            .font(.system(size: 24))
                    }
                    .buttonStyle(PlainButtonStyle())
                    .tooltip("Open Directory", customXOffset: 0)

                    if let selectedDirectory = selectedDirectory {
                        Text(selectedDirectory.lastPathComponent)
                            .bold()
                            .lineLimit(1)
                            .truncationMode(.middle) // Truncate in the middle if the directory name is too long
                            .frame(maxWidth: .infinity, alignment: .center) // Center the directory name
                    } else {
                        Text("Choose A Directory")
                            .italic()
                            .foregroundColor(.primary.opacity(0.5))
                            .frame(maxWidth: .infinity, alignment: .center) // Center the placeholder text
                    }

                    Button(action: openSelectedDirectoryInFinder) {
                        Image(systemName: "folder")
                            .font(.system(size: 24))
                    }
                    .disabled(selectedDirectory == nil)
                    .buttonStyle(PlainButtonStyle())
                    .tooltip("Open in Finder", customXOffset: -65)
                }
                .padding()

                List(images, id: \.self, selection: $selectedImages) { imageUrl in
                    HStack {
                        if let nsImage = NSImage(contentsOf: imageUrl) {
                            Image(nsImage: nsImage)
                                .resizable()
                                .frame(width: 75, height: 75)
                        } else {
                            Image(systemName: "photo")
                                .resizable()
                                .frame(width: 50, height: 50)
                        }
                        
                        VStack(alignment: .leading) {
                            Text(imageUrl.lastPathComponent)
                                .bold()
                                .lineLimit(1)
                                .truncationMode(.tail)
                                .foregroundColor(.primary)
                            
                            let caption = loadCaptionFromFile(for: imageUrl)
                            if !caption.isEmpty {
                                Text(caption)
                                    .font(.caption)
                                    .foregroundColor(.primary.opacity(0.6))
                                    .lineLimit(4)
                                    .truncationMode(.tail)
                            }
                        }
                    }
                    .padding(.vertical, 5)
                    .listRowBackground(Color.clear)
                }
                .customListStyle()
                .onChange(of: selectedImages) { oldValue, newValue in
                    handleImageSelection(newValue)
                }
            }
            .frame(width: leftSidebarWidth)
            
            // Draggable edge for left sidebar
            DraggableEdge(width: $leftSidebarWidth, minWidth: 200, maxWidth: 400, edge: .trailing)

            // Main Image Display
            VStack {
                if let selectedImage = selectedImage,
                   let nsImage = NSImage(contentsOf: selectedImage) {
                    Image(nsImage: nsImage)
                        .resizable()
                        .scaledToFit()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color.clear)
                        .padding()
                } else {
                    Text("Select an image")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color.clear)
                        .padding()
                }
                
                // Navigation for queue with Logo on the right side
                HStack {
                    // Previous/Next Controls
                    HStack {
                        Button(action: {
                            navigateImages(direction: -1)
                        }) {
                            Image(systemName: "chevron.up")
                                .font(.system(size: 20))
                        }
                        .disabled(currentImageIndex == 0 || selectedImages.count <= 1)
                        
                        Text("\(currentImageIndex + 1) / \(selectedImages.count)")
                        
                        Button(action: {
                            navigateImages(direction: 1)
                        }) {
                            Image(systemName: "chevron.down")
                                .font(.system(size: 20))
                        }
                        .disabled(currentImageIndex == selectedImages.count - 1 || selectedImages.count <= 1)
                    }
                    
                    Spacer()
                    
                    // Logo
                    Image(isDarkMode ? "LogoWhite" : "LogoBlack")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(height: 20) // Adjust height while maintaining aspect ratio
                }
                .padding()
                .buttonStyle(PlainButtonStyle())
                .frame(maxWidth: .infinity)
            }

            // Draggable edge for right sidebar
            DraggableEdge(width: $rightSidebarWidth, minWidth: 200, maxWidth: 400, edge: .leading)

            // Right Sidebar for Tag Management
            VStack {
                ScrollView {
                    VStack(alignment: .leading) {
                        // API Key Input and Model Dropdown side by side
                        HStack {
                            VStack(alignment: .leading) {
                                Text("API Key:")
                                    .font(.headline)
                                HStack {
                                    if isEditingApiKey {
                                        TextField("Enter your OpenAI API Key", text: $apiKey, onCommit: {
                                            isEditingApiKey = false
                                        })
                                        .textFieldStyle(RoundedBorderTextFieldStyle())
                                    } else {
                                        SecureField("API Key", text: .constant(String(repeating: "•", count: apiKey.count)))
                                            .textFieldStyle(RoundedBorderTextFieldStyle())
                                            .disabled(true)
                                    }
                                    Button(action: {
                                        isEditingApiKey.toggle()
                                    }) {
                                        Image(systemName: isEditingApiKey ? "eye.slash" : "eye")
                                    }
                                    .buttonStyle(.plain)
                                }
                            }

                            VStack(alignment: .leading) {
                                Text("Model:")
                                    .font(.headline)
                                Picker("", selection: $selectedModel) {
                                    ForEach(models, id: \.self) {
                                        Text($0)
                                    }
                                }
                                .pickerStyle(MenuPickerStyle())
                            }
                            
                            // Add the Dark/Light Mode Toggle Button at the right end
                            VStack {
                                Button(action: toggleAppearance) {
                                    Image(systemName: isDarkMode ? "sun.max.fill" : "moon.fill")
                                        .font(.system(size: 15)) // Make the icon smaller
                                }
                                .buttonStyle(PlainButtonStyle())
//                                .tooltip(isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode", customXOffset: -125)

                                Spacer() // Spacer to push the button to the top
                            }
                        }
                        
                        Divider().padding()

                        HStack {
                            AutoCaptionerView(
                                selectedImages: $selectedImages,
                                selectedImage: $selectedImage,
                                currentImageIndex: $currentImageIndex,
                                imageTags: $imageTags,
                                isGenerating: $isGenerating,
                                captionText: $captionText,
                                apiKey: $apiKey,
                                selectedModel: $selectedModel,
                                prependText: $prependText,
                                appendText: $appendText,
                                saveCaptionToFile: saveCaptionToFile
                            )
                        }
                        .frame(maxWidth: .infinity, alignment: .center)
                        
                        // Caption Text Editor with Rounded Corners, No Border, and Internal Padding
                        ZStack {
                            // Background color for the TextEditor to handle the padding
                            RoundedRectangle(cornerRadius: 20)
                                .padding() // This adds padding inside the frame, around the text

                            // Actual TextEditor
                            TextEditor(text: $captionText)
                                .font(.system(size: CGFloat(fontSize)))
                                .lineSpacing(5)
//                                .padding(10) // Adds padding inside the TextEditor to create space between text and the edges
                                .background(Color.clear) // Ensure the background is transparent
                                .cornerRadius(10) // Rounded corners
                                .onChange(of: captionText) { oldValue, newValue in
                                    let processedCaption = processCaption(newValue)
                                    if processedCaption != newValue {
                                        captionText = processedCaption
                                    }
                                    saveCaptionToFile(for: selectedImage, caption: processedCaption)
                                }
                                .frame(minHeight: 250, maxHeight: .infinity) // Dynamic height
                        }

                        // Font size adjustment with + and - buttons, centered
                        HStack {
                            Button(action: { fontSize = max(10, fontSize - 1) }) {
                                Image(systemName: "minus.circle")
                                    .font(.system(size: 20))
                            }
                            .buttonStyle(.plain)
                            
                            Button(action: { fontSize = min(24, fontSize + 1) }) {
                                Image(systemName: "plus.circle")
                                    .font(.system(size: 20))
                            }
                            .buttonStyle(.plain)
                        }
                        .padding(.top, 10) // Add some space above the buttons
                        .frame(maxWidth: .infinity, alignment: .center) // Center the buttons
                        
                        Divider().padding(.vertical)
                        
                        // Caption Modification Options
                        Text("Caption Modification")
                            .font(.headline)
                            .frame(maxWidth: .infinity, alignment: .center) // Center the buttons

                        TextField("Prepend Text", text: $prependText)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .padding(.vertical, 5)

                        TextField("Append Text", text: $appendText)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .padding(.vertical, 5)
                    }
                    .padding()
                }
            }
            .frame(width: rightSidebarWidth)
        }
        .frame(minWidth: 800, minHeight: 600)
        .disabled(isGenerating)
        .onAppear {
            // Initialize the dark mode state based on system settings
            let appearance = NSApp.effectiveAppearance
            isDarkMode = appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
        }
    }

    private func processCaption(_ caption: String) -> String {
        var processedCaption = caption.trimmingCharacters(in: .whitespacesAndNewlines)

        // Remove "The image features/depicts/shows..." text more aggressively
        let prefixesToRemove = ["The image features", "The image depicts", "The image shows", "This image depicts", "This image shows", "This image features", "The image appears to be ", "This image appears to be "]
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
    
    struct DraggableEdge: View {
        @Binding var width: CGFloat
        let minWidth: CGFloat
        let maxWidth: CGFloat
        let edge: Edge

        var body: some View {
            Rectangle()
                .fill(Color.gray.opacity(0.0001))
                .frame(width: 10)
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { value in
                            let delta = edge == .trailing ? value.translation.width : -value.translation.width
                            width = max(minWidth, min(maxWidth, width + delta))
                        }
                )
                .onHover { inside in
                    if inside {
                        NSCursor.resizeLeftRight.push()
                    } else {
                        NSCursor.pop()
                    }
                }
        }
    }

    // Function to toggle the appearance
    private func toggleAppearance() {
        isDarkMode.toggle()
        NSApp.appearance = isDarkMode ? NSAppearance(named: .darkAqua) : NSAppearance(named: .aqua)
    }

    private func sortedURLs(_ urls: Set<URL>) -> [URL] {
        return urls.sorted { $0.lastPathComponent.localizedStandardCompare($1.lastPathComponent) == .orderedAscending }
    }

    private func handleImageSelection(_ newSelection: Set<URL>) {
        if newSelection.count == 1, let selectedImage = newSelection.first {
            self.selectedImage = selectedImage
            self.captionText = loadCaptionFromFile(for: selectedImage)
            self.currentImageIndex = 0
        } else if newSelection.count > 1 {
            let sortedSelection = sortedURLs(newSelection)
            self.selectedImage = sortedSelection[currentImageIndex]
            self.captionText = loadCaptionFromFile(for: self.selectedImage!)
        } else {
            self.selectedImage = nil
            self.captionText = ""
            self.currentImageIndex = 0
        }
    }

    private func navigateImages(direction: Int) {
        let sortedImages = sortedURLs(selectedImages)
        currentImageIndex = (currentImageIndex + direction + sortedImages.count) % sortedImages.count
        selectedImage = sortedImages[currentImageIndex]
        captionText = loadCaptionFromFile(for: selectedImage!)
    }

    private func selectDirectory() {
        let panel = NSOpenPanel()
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        panel.allowsMultipleSelection = false

        if panel.runModal() == .OK {
            selectedDirectory = panel.urls.first
            
            // Clear the selection and reset related state
            selectedImages.removeAll() // Clear any selected images
            selectedImage = nil // Reset the currently selected image
            currentImageIndex = 0 // Reset the current image index
            captionText = "" // Clear any caption text

            // Load images from the new directory
            loadImages(from: selectedDirectory)
        }
    }

    private func openSelectedDirectoryInFinder() {
        guard let directory = selectedDirectory else { return }
        NSWorkspace.shared.selectFile(nil, inFileViewerRootedAtPath: directory.path)
    }
    
    private func loadImages(from directory: URL?) {
        guard let directory = directory else { return }

        do {
            let files = try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)
            images = files.filter { $0.pathExtension.lowercased() == "png" || $0.pathExtension.lowercased() == "jpg" }
        } catch {
            print("Failed to load images: \(error.localizedDescription)")
        }
    }

    private func saveCaptionToFile(for image: URL?, caption: String) {
        guard let image = image else { return }

        let captionFileURL = image.deletingPathExtension().appendingPathExtension("txt")

        do {
            try caption.write(to: captionFileURL, atomically: true, encoding: .utf8)
        } catch {
            print("Failed to save caption: \(error.localizedDescription)")
        }
    }

    private func loadCaptionFromFile(for imageURL: URL) -> String {
        let captionFileURL = imageURL.deletingPathExtension().appendingPathExtension("txt")
        
        // Check if the caption file exists before trying to load it
        if FileManager.default.fileExists(atPath: captionFileURL.path) {
            do {
                return try String(contentsOf: captionFileURL, encoding: .utf8)
            } catch {
                print("Failed to load caption for \(imageURL.lastPathComponent): \(error.localizedDescription)")
            }
        }
        
        return "" // Return an empty string if the file doesn't exist or can't be loaded
    }
}
