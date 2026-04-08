from django.urls import path
from . import views

urlpatterns = [
    path('auth/register', views.RegisterView.as_view()),
    path('auth/login', views.CustomTokenObtainPairView.as_view()),
    
    path('patients', views.get_patients),
    path('chat', views.process_chat),
    path('clear/<int:patient_id>', views.clear_history),
    
    path('therapist/update/<int:patient_id>', views.therapist_update),
    path('therapist/module/<int:patient_id>/<str:module_id>', views.update_module),
    path('therapist/message/<int:patient_id>', views.therapist_message),
    path('therapist/upload-pdf/<int:patient_id>', views.upload_pdf),
    path('therapist/module/complete/<int:patient_id>', views.complete_module),
    
    path('therapist/session/start/<int:patient_id>', views.start_session),
    path('therapist/session/end/<int:patient_id>', views.end_session),
    path('therapist/session/note/<int:patient_id>', views.add_session_note),
    path('therapist/session/notes/<int:patient_id>', views.list_session_notes),

    path('patient/state/<int:patient_id>', views.get_patient_state),
    path('chat_page/<int:patient_id>', views.chat_page),
    path('history/<int:patient_id>', views.get_history),

    path('journal/entry/<int:patient_id>', views.add_entry),
    path('journal/<int:patient_id>', views.get_or_delete_entries),
    path('journal/<int:patient_id>/<int:entry_id>', views.get_entry),
    path('journal/reframe', views.reframe_thought),
    path('journal/entry/<int:patient_id>/<int:entry_id>/save-reframe', views.save_reframe),
    path('journal/graph', views.generate_graph),
]
