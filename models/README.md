# RF-DETR ONNX model location

Place the verified Roboflow-exported bus-passenger model here as:

```text
models/bus-passengers-rfdetr-s-v1.onnx
```

ONNX files are ignored by Git because they can be large and may have separate licensing or distribution requirements.

Verified export (2026-09-29):

- Source checkpoint SHA-256: `560DD9CDECCFF8ED0312C3200CCC3E8AFFF2AC6CB979B37F5AC6DD5832CFBBF7`
- ONNX SHA-256: `DDBFBDD9315B9549905CAF5EE4E5C9E27F89DF15A9921217BDA4225E9CE07E6E`
- RF-DETR export package: `1.11.0`
- ONNX opset: 17
- Input: `input`, float32 `[1,3,640,640]`
- Outputs: `dets`, float32 `[1,300,4]`; `labels`, float32 `[1,300,3]`
- Logit mapping: column 0 unused `passenger`, column 1 `sitting`, column 2 `standing`

The approved one-time export used Python in an isolated temporary environment. The application runtime remains Python-free.
