# RF-DETR ONNX model location

Place the verified Roboflow-exported bus-passenger model here as:

```text
models/bus-passengers-rfdetr-s-v1.onnx
```

ONNX files are ignored by Git because they can be large and may have separate licensing or distribution requirements. Before implementing inference, record all input and output tensor names, shapes, and types from ONNX Runtime. Verify the class indices for `sitting` and `standing`; do not infer them from the project class list.

The approved one-time export/conversion may use Python outside the application runtime. After export, compute and record the SHA-256 checksum and export date. The app itself remains Python-free.
