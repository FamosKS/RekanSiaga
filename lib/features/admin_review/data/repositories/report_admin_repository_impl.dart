import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../reports/domain/entities/report.dart';
import '../../domain/entities/report_review.dart';
import '../../domain/repositories/report_admin_repository.dart';

class ReportAdminRepositoryImpl implements ReportAdminRepository {
  const ReportAdminRepositoryImpl(this._client);

  final SupabaseClient _client;

  @override
  Future<ReportReview> getReportById(String reportId) async {
    final row = await _client
        .from('public_reports')
        .select(
          'id,tracking_code,title,description,report_type,status,created_at',
        )
        .eq('id', reportId)
        .maybeSingle();

    if (row == null) {
      throw StateError('Laporan tidak ditemukan atau tidak dapat diakses.');
    }

    return _reportFromRow(row);
  }

  @override
  Future<ReportReview> updateReportStatus({
    required String reportId,
    required ReportStatus newStatus,
    required String actorStaffId,
    String? note,
  }) async {
    final currentUserId = _client.auth.currentUser?.id;
    if (currentUserId == null || currentUserId != actorStaffId) {
      throw StateError('Identitas staf tidak sesuai dengan sesi login.');
    }

    final response = await _client.rpc(
      'update_public_report_status',
      params: {
        'p_report_id': reportId,
        'p_new_status': _statusToDatabaseValue(newStatus),
        'p_note': note,
      },
    );

    if (response is! List ||
        response.isEmpty ||
        response.first is! Map<String, dynamic>) {
      throw const FormatException(
        'Respons update status laporan dari Supabase tidak valid.',
      );
    }
    return _reportFromRow(response.first as Map<String, dynamic>);
  }

  ReportReview _reportFromRow(Map<String, dynamic> row) {
    return ReportReview(
      id: _requiredString(row, 'id'),
      trackingCode: _requiredString(row, 'tracking_code'),
      title: _requiredString(row, 'title'),
      description: _requiredString(row, 'description'),
      reportType: _requiredString(row, 'report_type'),
      status: _statusFromDatabaseValue(_requiredString(row, 'status')),
      createdAt: _dateTime(row, 'created_at'),
    );
  }

  DateTime _dateTime(Map<String, dynamic> row, String column) {
    final value = row[column];
    if (value is! String) {
      throw FormatException('Kolom "$column" tidak valid pada laporan.');
    }
    final parsed = DateTime.tryParse(value);
    if (parsed == null) {
      throw FormatException('Kolom "$column" bukan tanggal yang valid.');
    }
    return parsed;
  }

  String _requiredString(Map<String, dynamic> row, String column) {
    final value = row[column];
    if (value is! String || value.isEmpty) {
      throw FormatException('Kolom "$column" tidak valid pada laporan.');
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
