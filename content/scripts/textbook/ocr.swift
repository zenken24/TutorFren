import Foundation
import Vision
import AppKit
// usage: ocr <lang> <outdir> <img>...   prints lines sorted top-to-bottom with bbox
let args = CommandLine.arguments
if args.count == 2 && args[1] == "langs" {
  let r = VNRecognizeTextRequest(); r.recognitionLevel = .accurate
  print((try? r.supportedRecognitionLanguages()) ?? [])
  exit(0)
}
let lang = args[1]; let outdir = args[2]
for path in args[3...] {
  guard let img = NSImage(contentsOfFile: path), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }
  let req = VNRecognizeTextRequest()
  req.recognitionLevel = .accurate
  req.recognitionLanguages = [lang]
  req.usesLanguageCorrection = true
  let h = VNImageRequestHandler(cgImage: cg, options: [:])
  try? h.perform([req])
  var rows: [(Double, Double, String)] = []
  var js: [[String: Any]] = []
  for o in (req.results ?? []) {
    if let c = o.topCandidates(1).first {
      let b = o.boundingBox
      rows.append((1.0 - Double(b.maxY), Double(b.minX), c.string))
      js.append(["x": Double(b.minX), "y": 1.0 - Double(b.maxY), "w": Double(b.width), "h": Double(b.height), "t": c.string])
    }
  }
  // group into lines by y
  rows.sort { abs($0.0 - $1.0) < 0.008 ? $0.1 < $1.1 : $0.0 < $1.0 }
  var out = ""
  var lastY = -1.0
  for r in rows {
    if lastY >= 0 && abs(r.0 - lastY) < 0.008 { out += "  |  " + r.2 } else { out += (lastY >= 0 ? "\n" : "") + r.2 }
    lastY = r.0
  }
  let name = (path as NSString).lastPathComponent.replacingOccurrences(of: ".png", with: ".txt")
  try? out.write(toFile: outdir + "/" + name, atomically: true, encoding: .utf8)
  if let d = try? JSONSerialization.data(withJSONObject: js) { try? d.write(to: URL(fileURLWithPath: outdir + "/" + name.replacingOccurrences(of: ".txt", with: ".json"))) }
}
