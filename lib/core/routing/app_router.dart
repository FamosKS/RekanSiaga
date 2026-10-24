import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../features/public/presentation/pages/public_main_page.dart';
import '../../features/public/presentation/pages/pemantauan_page.dart';
import '../../features/public/presentation/pages/panduan_siaga_page.dart';
import '../../features/public/presentation/pages/sos_page.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/profile_page.dart';
import '../../features/admin_review/presentation/pages/report_detail_page.dart';
import '../../features/dashboard/presentation/pages/dashboard_page.dart';
import '../../features/reports/presentation/pages/submit_report_page.dart';

abstract final class AppRoutes {
  static const root = '/';
  static const sos = '/sos';
  static const monitoring = '/pemantauan';
  static const guide = '/panduan';
  static const login = '/staff-login';
  static const dashboard = '/staff-dashboard';
  static const profile = '/profile';
  static const submitReport = '/submit-report';
  static const reportDetailName = 'report-detail';
  static const reportDetailPath = '/report-detail/:reportId';
}

GoRouter createAppRouter({SupabaseClient? supabaseClient}) {
  final refreshListenable = _AuthStateRefreshListenable(supabaseClient);
  return GoRouter(
    initialLocation: AppRoutes.root,
    refreshListenable: refreshListenable,
    redirect: (context, state) {
      final isAuthenticated = supabaseClient?.auth.currentSession != null;
      final path = state.uri.path;
      final isLoginRoute = path == AppRoutes.login;
      final isStaffProtectedRoute =
          path == AppRoutes.dashboard ||
          path == AppRoutes.profile ||
          path.startsWith('/report-detail/');

      if (!isAuthenticated && isStaffProtectedRoute) {
        return AppRoutes.login;
      }
      if (isAuthenticated && isLoginRoute) {
        return AppRoutes.dashboard;
      }
      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.root,
        builder: (context, state) => const PublicMainPage(),
      ),
      GoRoute(
        path: AppRoutes.sos,
        builder: (context, state) => const SosPage(),
      ),
      GoRoute(
        path: AppRoutes.monitoring,
        builder: (context, state) => const PemantauanPage(),
      ),
      GoRoute(
        path: AppRoutes.guide,
        builder: (context, state) => const PanduanSiagaPage(),
      ),
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: AppRoutes.dashboard,
        builder: (context, state) => const DashboardPage(),
      ),
      GoRoute(
        path: AppRoutes.profile,
        builder: (context, state) => const ProfilePage(),
      ),
      GoRoute(
        name: AppRoutes.reportDetailName,
        path: AppRoutes.reportDetailPath,
        builder: (context, state) =>
            ReportDetailPage(reportId: state.pathParameters['reportId']!),
      ),
      GoRoute(
        path: AppRoutes.submitReport,
        builder: (context, state) => const SubmitReportPage(),
      ),
    ],
  );
}

class _AuthStateRefreshListenable extends ChangeNotifier {
  _AuthStateRefreshListenable(SupabaseClient? client) {
    _subscription = client?.auth.onAuthStateChange.listen((_) {
      notifyListeners();
    });
  }

  StreamSubscription<AuthState>? _subscription;

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}
