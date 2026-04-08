from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.conf import settings

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('therapist', 'Therapist'),
        ('client', 'Client'),
    ]
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='client')
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return f"{self.email} ({self.role})"


class Patient(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='patient_profile', null=True)
    name = models.CharField(max_length=255, blank=True, null=True)
    therapist_tone = models.CharField(max_length=255, blank=True, null=True)
    active_worksheet_context = models.TextField(blank=True, null=True)
    active_module_id = models.CharField(max_length=255, blank=True, null=True)
    pending_checkin = models.TextField(blank=True, null=True)
    treatment_plan = models.JSONField(default=list, blank=True)
    session_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name or 'Unknown'} (ID: {self.id})"


class Message(models.Model):
    ROLE_CHOICES = [
        ('human', 'Human'),
        ('ai', 'AI'),
        ('system', 'System'),
    ]
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='history')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"[{self.role}] {self.content[:30]}..."


class SessionNote(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='session_notes')
    author = models.CharField(max_length=255, default="therapist")
    note = models.TextField()
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"Note by {self.author} at {self.timestamp}"


class JournalEntry(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='journal_entries')
    text = models.TextField()
    predictions = models.JSONField(default=list, blank=True)
    reframings = models.JSONField(default=list, blank=True)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"Journal {self.id} for {self.patient.name}"
