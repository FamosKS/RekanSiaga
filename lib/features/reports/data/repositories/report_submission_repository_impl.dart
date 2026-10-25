import 'package:supabase_flutter/supabase_flutter.dart';

import '../../domain/entities/report.dart';
import '../../domain/entities/report_submission.dart';
import '../../domain/entities/submitted_report.dart';
import '../../domain/repositories/report_submission_repository.dart';

class ReportSubmissionRepositoryImpl implements ReportSubmissionRepository {
  const ReportSubmissionRepositoryImpl(this._client);

  final SupabaseClient _client;

  @override
  Future<SubmittedReport> submitReport({
    required ReportSubmission submission,
    required String trackingCode,
    required ReportStatus status,
  }) async {
    final row = await _client
        .from('public_reports')
        .insert({
          'tracking_code': trackingCode,
          'status': _statusToDatabaseValue(status),
          'title': submission.title,
          'description': submission.description,
          'report_type': submission.reportType,
          if (submission.coordinatesWkt != null)
            'coordinates': submission.coordinatesWkt,
        })
        .select('id,tracking_code,title,description,report_type,status')
        .single();

    return SubmittedReport(
      id: _requiredString(row, 'id'),
      trackingCode: _requiredString(row, 'tracking_code'),
      title: _requiredString(row, 'title'),
      description: _requiredString(row, 'description'),
      reportType: _requiredString(row, 'report_type'),
      status: _statusFromDatabaseValue(_requiredString(row, 'status')),
    );
  }

  String _requiredString(Map<String, dynamic> row, String key) {
    final value = row[key];
    if (value is! String || value.isEmpty) {
      throw FormatException('Kolom "$key" tidak valid pada respons laporan.');
    }
    return value;
  }

  String _statusToDatabaseValue(ReportStatus status) {
    return switch (status) {
      ReportStatus.draft => 'draft',
      ReportStatus.submitted => 'submitted',
      ReportStatus.underReview => 'under_review',
      ReportStatus.approved => 'approved',
      ReportStatus.rejected => 'rejected',
      ReportStatus.resolved => 'resolved',
    };
  }

  ReportStatus _statusFromDatabaseValue(String value) {
    return switch (value) {
      'draft' => ReportStatus.draft,
      'submitted' => ReportStatus.submitted,
      'under_review' => ReportStatus.underReview,
      'approved' => ReportStatus.approved,
      'rejected' => ReportStatus.rejected,
      'resolved' => ReportStatus.resolved,
      _ => throw FormatException('Status laporan tidak dikenali: $value'),
    };
  }
}
