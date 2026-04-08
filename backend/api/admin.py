from django.contrib import admin
from .models import Patient, Message, SessionNote, JournalEntry

admin.site.register(Patient)
admin.site.register(Message)
admin.site.register(SessionNote)
admin.site.register(JournalEntry)
