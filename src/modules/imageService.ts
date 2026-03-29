const WORKER_URL = "https://photo-upload.guatemaltausa.workers.dev"

export async function resizeImage(file: File, maxWidth = 800, maxHeight = 800): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Failed to get canvas context"));
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas compression failed"));
          },
          "image/png"
        );
      };
    };
    reader.onerror = (err) => reject(err);
  });
}

export async function uploadImage(image: Blob | File): Promise<string> {
  const response = await fetch(WORKER_URL, {
    method: "POST",
    body: image,
    headers: {
      "Content-Type": "image/png",
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to upload image to Cloudflare");
  }

  const data = await response.json();
  return data.url;
}

export async function deleteImage(photoURL: string): Promise<void> {
  try {
    const filename = photoURL.split("/").pop();

    if (!filename) throw new Error("Could not parse filename from URL");

    const response = await fetch(`${WORKER_URL}?filename=${filename}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete image from R2");
    }

    console.log(`Deleted image: ${filename}`);
  } catch (error) {
    console.error("Error in deleteImage:", error);
  }
}