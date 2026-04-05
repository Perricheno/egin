import * as ort from 'onnxruntime-web';

// Define the interface for messages sent to the worker
export interface SamWorkerMessage {
  type: 'INIT' | 'RUN';
  modelUrl?: string;
  embedding?: Float32Array; // The precomputed image embedding from the backend
  point?: { x: number; y: number; label: number }; // Click coordinate relative to the 1024x1024 tensor
  tensorSize?: number; // Usually 1024
}

// Ensure WebAssembly uses multiple threads if available and specifies the path
ort.env.wasm.numThreads = 1;
//ort.env.wasm.wasmPaths = '/'; // By default it will look in the public folder where we copied them

let session: ort.InferenceSession | null = null;
let currentEmbedding: ort.Tensor | null = null;
const workerScope = self as unknown as {
  addEventListener: (
    type: 'message',
    listener: (event: { data: SamWorkerMessage }) => void,
  ) => void;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};

// Initialize the ONNX session
async function initModel(modelUrl: string) {
  try {
    session = await ort.InferenceSession.create(modelUrl, {
      executionProviders: ['wasm'], // Use 'webgpu' if targeting devices with good GPUs later
    });
    console.log('MobileSAM ONNX model loaded successfully.');
    workerScope.postMessage({ type: 'INIT_SUCCESS' });
  } catch (err: any) {
    console.error('Failed to init ONNX model:', err);
    workerScope.postMessage({ type: 'INIT_ERROR', error: err.message });
  }
}

// Run the SAM Decoder given an embedding and a click point
async function runInference(
  embeddingArray: Float32Array,
  point: { x: number; y: number; label: number },
  tensorSize: number = 1024
) {
  if (!session) {
    workerScope.postMessage({ type: 'ERROR', error: 'Session not initialized.' });
    return;
  }

  try {
    // 1. Create the Image Embedding Tensor
    // SAM typically expects 1x256x64x64 for MobileSAM (this might change based on specific export)
    // We recreate the tensor from the raw float array sent by the main thread.
    // NOTE: The exact shape depends on the exported SAM model (usually [1, 256, 64, 64]).
    if (!currentEmbedding || embeddingArray.byteLength > 0) {
       currentEmbedding = new ort.Tensor('float32', embeddingArray, [1, 256, 64, 64]);
    }

    // 2. Create the Point Prompt Tensors
    // coords: [1, num_points, 2]
    // labels: [1, num_points]
    const pointCoords = new Float32Array([point.x, point.y]);
    const pointLabels = new Float32Array([point.label]); // 1 = foreground, 0 = background

    const coordsTensor = new ort.Tensor('float32', pointCoords, [1, 1, 2]);
    const labelsTensor = new ort.Tensor('float32', pointLabels, [1, 1]);

    // 3. Mask Input Tensor (if previous mask exists, else zeros)
    // Usually [1, 1, 256, 256]
    const maskInput = new ort.Tensor('float32', new Float32Array(256 * 256), [1, 1, 256, 256]);
    const hasMaskInput = new ort.Tensor('float32', new Float32Array([0]), [1]);

    // 4. Original Image Size (for post-processing inside the model)
    const origImageData = new Float32Array([tensorSize, tensorSize]);
    const origImageSize = new ort.Tensor('float32', origImageData, [2]);

    // 5. Run Inference
    const feeds = {
      image_embeddings: currentEmbedding!,
      point_coords: coordsTensor,
      point_labels: labelsTensor,
      mask_input: maskInput,
      has_mask_input: hasMaskInput,
      orig_im_size: origImageSize,
    };

    const results = await session.run(feeds);
    
    // 6. Extract the Mask
    // Output is usually named 'masks', shapes vary but typically [1, 1, h, w] or similar.
    const mask = results['masks']; 
    
    // We send back the raw float array of logits
    workerScope.postMessage({
      type: 'RESULT',
      mask: mask.data,
      dims: mask.dims,
    });

  } catch (error: any) {
    console.error('Inference error:', error);
    workerScope.postMessage({ type: 'ERROR', error: error.message });
  }
}

workerScope.addEventListener('message', (e) => {
  const { type, modelUrl, embedding, point, tensorSize } = e.data;

  if (type === 'INIT' && modelUrl) {
    initModel(modelUrl);
  } else if (type === 'RUN' && embedding && point) {
    runInference(embedding, point, tensorSize || 1024);
  }
});
