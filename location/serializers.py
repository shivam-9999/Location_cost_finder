import hashlib
from rest_framework import serializers
from .models import LocationImage
from PIL import Image

class LocationImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = LocationImage
        fields = ['id', 'image', 'uploaded_at']

    def validate_image(self, value):
        # Validate file size (5MB max)
        max_size = 5 * 1024 * 1024  # 5MB
        if value.size > max_size:
            raise serializers.ValidationError("Image file is too large. Maximum size is 5MB.")

        # Validate file format
        valid_formats = ['image/jpeg', 'image/png', 'image/jpg']
        if value.content_type not in valid_formats:
            raise serializers.ValidationError("Unsupported file format. Allowed: JPEG, PNG, JPG.")

        # Validate image dimensions
        img = Image.open(value)
        min_width, min_height = 200, 200
        max_width, max_height = 4000, 4000

        if img.width < min_width or img.height < min_height:
            raise serializers.ValidationError(f"Image dimensions too small. Minimum: {min_width}x{min_height} pixels.")

        if img.width > max_width or img.height > max_height:
            raise serializers.ValidationError(f"Image dimensions too large. Maximum: {max_width}x{max_height} pixels.")

        # Compute hash of the uploaded file
        hasher = hashlib.md5()
        value.open()
        for chunk in value.chunks():
            hasher.update(chunk)
        file_hash = hasher.hexdigest()

        # Check if image with the same hash already exists **before saving**
        if LocationImage.objects.filter(image_hash=file_hash).exists():
            raise serializers.ValidationError("This image has already been uploaded before.")

        # Store the hash in the serializer instance to avoid saving issues
        self.image_hash = file_hash

        return value

    def create(self, validated_data):
        """Override to store the computed image hash before saving."""
        validated_data['image_hash'] = self.image_hash
        return super().create(validated_data)
