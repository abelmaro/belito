import faiss
import numpy as np
import pickle
import os

class IndexManager:
    def __init__(self, dim: int = 768):
        self.dim = dim
        self.index = faiss.IndexFlatL2(dim)
        self.texts = []

    def add(self, vectors: np.ndarray, texts: list[str]):
        self.index.add(vectors)
        self.texts.extend(texts)

    def search(self, vector: np.ndarray, k: int = 3) -> list[str]:
        distances, indices = self.index.search(vector, k)
        return [self.texts[int(i)] for i in indices[0] if int(i) >= 0 and int(i) < len(self.texts)]

    def save(self, index_path: str, texts_path: str):
        faiss.write_index(self.index, index_path)
        with open(texts_path, 'wb') as f:
            pickle.dump(self.texts, f)

    def load(self, index_path: str, texts_path: str):
        if os.path.exists(index_path):
            self.index = faiss.read_index(index_path)
        if os.path.exists(texts_path):
            with open(texts_path, 'rb') as f:
                self.texts = pickle.load(f)

index_manager = IndexManager()
