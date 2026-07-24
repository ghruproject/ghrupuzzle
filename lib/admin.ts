export interface AdminStats {
  participants: number;
  activeEnrolments: number;
  submissions: number;
  openReviews: number;
  registeredReleases: number;
  activeCertificates: number;
}

export interface AdminRound {
  id: string;
  slug: string;
  title: string;
  registration_mode: 'open' | 'invite';
  registration_opens_at: string | null;
  opens_at: string;
  closes_at: string;
  answers_release_at: string | null;
  grace_seconds: number;
  status: string;
  active_enrolments: number;
  invitations: number;
  releases: number;
  submissions: number;
  open_reviews: number;
  provisional_scores: number;
}

export interface AdminRelease {
  id: string;
  release_id: string;
  exercise: 'typing' | 'assembly' | 'hybrid' | 'outbreak';
  mode: 'practice' | 'challenge';
  schema_version: string;
  published_at: string | null;
  round_id: string | null;
  round_title: string | null;
  submissions: number;
}

export interface AdminParticipant {
  id: string;
  name: string;
  email: string;
  created_at: number;
  roles: string | null;
  is_administrator: number;
  active_enrolments: number;
  submissions: number;
  last_submission_at: string | null;
}

export interface AdminCertificateCandidate {
  user_id: string;
  participant_name: string;
  participant_email: string;
  round_id: string;
  round_title: string;
  passed_exercises: number;
  open_reviews: number;
  active_certificate_id: string | null;
}

export interface AdminCertificate {
  id: string;
  public_code: string;
  issued_at: string;
  revoked_at: string | null;
  revocation_reason: string | null;
  user_id: string;
  participant_name: string;
  participant_email: string;
  round_id: string;
  round_title: string;
}

export interface AdminAuditEvent {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  created_at: string;
  actor_name: string | null;
  actor_email: string | null;
}

export interface AdministratorEmail {
  email: string;
  created_at: string;
  added_by_name: string | null;
  added_by_email: string | null;
}

export interface AdminOverview {
  stats: AdminStats;
  rounds: AdminRound[];
  releases: AdminRelease[];
  participants: AdminParticipant[];
  certificateCandidates: AdminCertificateCandidate[];
  certificates: AdminCertificate[];
  auditEvents: AdminAuditEvent[];
  administrators: AdministratorEmail[];
}
