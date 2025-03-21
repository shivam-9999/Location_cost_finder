import hashlib
from django.db import models

def upload_to(instance, filename):
    "Define image upload path"
    return f'uploads/{filename}'

class LocationImage(models.Model):
    id = models.AutoField(primary_key=True)
    image = models.ImageField(upload_to=upload_to)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    image_hash = models.CharField(max_length=64, blank=True, null=True)  #  For duplicate detection
    home_address = models.CharField(max_length=255, blank=True, null=True)
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    distance_km = models.FloatField(blank=True, null=True)

    def calculate_image_hash(self):
        """Compute MD5 hash of the image."""
        if not self.image:
            return None  # ✅ Skip hashing if no image
        hasher = hashlib.md5()
        self.image.open()  # Open the file before hashing
        for chunk in self.image.chunks():
            hasher.update(chunk)
        return hasher.hexdigest()

    def save(self, *args, **kwargs):
        # Generate and store the image hash during save
        if not self.image_hash:
            self.image_hash = self.calculate_image_hash()

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Image {self.id} - {self.image.name}"