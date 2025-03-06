import os
import uuid
import hashlib
from django.db import models

def upload_to(instance, filename):
    ext = filename.split('.')[-1]
    unique_filename = f"{uuid.uuid4().hex}.{ext}"
    return os.path.join('uploads/', unique_filename)

class LocationImage(models.Model):
    image = models.ImageField(upload_to=upload_to)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    image_hash = models.CharField(max_length=64, unique=True, blank=True, null=True)  # New field for duplicate checking

    def save(self, *args, **kwargs):
        if not self.image_hash:  # Generate hash only if it doesn't exist
            self.image_hash = self.calculate_image_hash()
        super().save(*args, **kwargs)

    def calculate_image_hash(self):
        """Compute MD5 hash of the image."""
        hasher = hashlib.md5()
        self.image.open()
        for chunk in self.image.chunks():
            hasher.update(chunk)
        return hasher.hexdigest()

    def __str__(self):
        return f"Image {self.id} - {self.image.name}"
