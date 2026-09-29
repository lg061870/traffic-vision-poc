# Detection layer

RF-DETR ONNX model loading, preprocessing, inference, and post-processing belong here. The target v1 classes are `sitting` and `standing`, with a suggested confidence threshold of 0.40.

Before implementing a parser, inspect and record ONNX Runtime `InputMetadata` and `OutputMetadata`. Do not assume tensor names, dimensions, class indices, or output ordering. The expected 640×640 RGB/CHW contract and DETR outputs are guidance only until verified against the actual export.
