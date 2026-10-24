import 'package:supabase_flutter/supabase_flutter.dart';

import '../../domain/entities/active_report.dart';
import '../../domain/repositories/active_report_repository.dart';

class ActiveReportRepositoryImpl implements ActiveReportRepository {
  const ActiveReportRepositoryImpl(this._client);

  static const _activeStatuses = ['submitted', 'under_review', 'approved'];

  final SupabaseClient _client;

  @override
  Future<List<ActiveReport>> getActiveReports() async {
    final rows = await _client
        .from('public_reports')
        .select('id,tracking_code,title,description,status,created_at')
        .inFilter('status', _activeStatuses);

    return rows.map(_activeReportFromRow).toList(growable: false);
  }

  ActiveReport _activeReportFromRow(Map<String, dynamic> row) {
    final id = row['id'];
    final trackingCode = row['tracking_code'];
    final title = row['title'];
    final description = row['description'];
    final status = row['status'];
    final createdAtValue = row['created_at'];

    if (id is! String ||
        trackingCode is! String ||
        title is! String ||
        description is! String ||
        status is! String ||
        createdAtValue is! String) {
      throw const FormatException(
        'Data laporan aktif dari Supabase tidak sesuai skema.',
      );
    }

    final createdAt = DateTime.tryParse(createdAtValue);
    if (createdAt == null) {
      throw const FormatException(
        'Tanggal pembuatan laporan dari Supabase tidak valid.',
      );
    }

    return ActiveReport(
      id: id,
      trackingCode: trackingCode,
      title: title,
      description: description,
      status: status,
      createdAt: createdAt,
    );
  }
}
