import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../reports/data/repositories/active_report_repository_impl.dart';
import '../../../reports/domain/entities/active_report.dart';
import '../../../reports/domain/repositories/active_report_repository.dart';
import '../../../reports/domain/usecases/get_active_reports_usecase.dart';

final activeReportRepositoryProvider = Provider<ActiveReportRepository>((ref) {
  return ActiveReportRepositoryImpl(Supabase.instance.client);
});

final getActiveReportsUseCaseProvider = Provider<GetActiveReportsUseCase>((
  ref,
) {
  return GetActiveReportsUseCase(ref.watch(activeReportRepositoryProvider));
});

final activeReportsProvider = FutureProvider<List<ActiveReport>>((ref) {
  return ref.watch(getActiveReportsUseCaseProvider).execute();
});
