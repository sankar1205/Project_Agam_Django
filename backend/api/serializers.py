from rest_framework import serializers
from .models import Patient
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        if hasattr(user, 'patient_profile') and user.patient_profile:
            token['patient_id'] = user.patient_profile.id
        return token
    
    def validate(self, attrs):
        data = super().validate(attrs)
        data['role'] = self.user.role
        if hasattr(self.user, 'patient_profile') and self.user.patient_profile:
            data['patient_id'] = self.user.patient_profile.id
        return data

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    name = serializers.CharField(write_only=True, required=False) # For Patient model
    
    class Meta:
        model = User
        fields = ('email', 'password', 'role', 'name')
        
    def create(self, validated_data):
        name = validated_data.pop('name', '')
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            role=validated_data.get('role', 'client')
        )
        if user.role == 'client':
            Patient.objects.create(user=user, name=name)
        return user


class ChatRequestSerializer(serializers.Serializer):
    patient_id = serializers.IntegerField()
    message = serializers.CharField()


class TherapistUpdateSerializer(serializers.Serializer):
    therapist_tone = serializers.CharField(required=False, allow_null=True)
    active_worksheet_context = serializers.CharField(required=False, allow_null=True)
    pending_checkin = serializers.CharField(required=False, allow_null=True)


class TherapistMessageSerializer(serializers.Serializer):
    message = serializers.CharField()


class ModuleUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_null=True)
    clinical_goal = serializers.CharField(required=False, allow_null=True)
    status = serializers.CharField(required=False, allow_null=True)


class SessionToggleSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_null=True)


class SessionNoteSerializer(serializers.Serializer):
    author = serializers.CharField(required=False, allow_null=True, default="therapist")
    note = serializers.CharField()


class JournalRequestSerializer(serializers.Serializer):
    text = serializers.CharField()


class ReframeMessageSerializer(serializers.Serializer):
    role = serializers.CharField()
    content = serializers.CharField()


class ReframeRequestSerializer(serializers.Serializer):
    sentence = serializers.CharField()
    distortion_type = serializers.CharField()
    history = ReframeMessageSerializer(many=True, required=False, default=list)


class ReframeStepSerializer(serializers.Serializer):
    prompt = serializers.CharField()
    user_response = serializers.CharField(required=False, allow_null=True)


class SaveReframeRequestSerializer(serializers.Serializer):
    sentence = serializers.CharField()
    distortion_type = serializers.CharField()
    steps = ReframeStepSerializer(many=True)


class GraphRequestSerializer(serializers.Serializer):
    text = serializers.CharField()
    predictions = serializers.ListField(child=serializers.DictField())


class PatientStateSerializer(serializers.ModelSerializer):
    last_session_note_preview = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            'name', 'therapist_tone', 'active_worksheet_context',
            'pending_checkin', 'treatment_plan', 'active_module_id',
            'session_active', 'last_session_note_preview'
        ]

    def get_last_session_note_preview(self, obj):
        last_note = obj.session_notes.order_by('-timestamp').first()
        if last_note:
            return {
                "author": last_note.author,
                "note": last_note.note,
                "timestamp": last_note.timestamp
            }
        return None
