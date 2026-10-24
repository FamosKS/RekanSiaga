import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../admin_review/presentation/providers/report_review_provider.dart';
import '../../../dashboard/presentation/providers/active_reports_provider.dart';
import '../../../reports/presentation/providers/submit_report_provider.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../../domain/entities/staff.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/usecases/get_current_staff_usecase.dart';
import '../../domain/usecases/login_staff_usecase.dart';
import '../../domain/usecases/logout_staff_usecase.dart';

final supabaseClientProvider = Provider<SupabaseClient>((ref) {
  return Supabase.instance.client;
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepositoryImpl(ref.watch(supabaseClientProvider));
});

final loginStaffUseCaseProvider = Provider<LoginStaffUseCase>((ref) {
  return LoginStaffUseCase(ref.watch(authRepositoryProvider));
});

final getCurrentStaffUseCaseProvider = Provider<GetCurrentStaffUseCase>((ref) {
  return GetCurrentStaffUseCase(ref.watch(authRepositoryProvider));
});

final logoutStaffUseCaseProvider = Provider<LogoutStaffUseCase>((ref) {
  return LogoutStaffUseCase(ref.watch(authRepositoryProvider));
});

final currentStaffProvider = FutureProvider<Staff>((ref) {
  return ref.watch(getCurrentStaffUseCaseProvider).execute();
});

final logoutControllerProvider =
    NotifierProvider<LogoutController, LogoutState>(LogoutController.new);

enum LogoutStatus { idle, loading, success, failure }

class LogoutState {
  const LogoutState({this.status = LogoutStatus.idle, this.errorMessage});

  final LogoutStatus status;
  final String? errorMessage;
}

class LogoutController extends Notifier<LogoutState> {
  @override
  LogoutState build() => const LogoutState();

  Future<void> logout() async {
    state = const LogoutState(status: LogoutStatus.loading);

    try {
      await ref.read(logoutStaffUseCaseProvider).execute();
      ref.invalidate(currentStaffProvider);
      ref.invalidate(loginControllerProvider);
      ref.invalidate(activeReportsProvider);
      ref.invalidate(reportReviewProvider);
      ref.invalidate(submitReportControllerProvider);
      state = const LogoutState(status: LogoutStatus.success);
    } on Exception catch (error) {
      state = LogoutState(
        status: LogoutStatus.failure,
        errorMessage: error.toString(),
      );
    }
  }
}

final loginControllerProvider = NotifierProvider<LoginController, LoginState>(
  LoginController.new,
);

enum LoginStatus { initial, loading, success, failure }

class LoginState {
  const LoginState({
    this.status = LoginStatus.initial,
    this.staff,
    this.errorMessage,
  });

  final LoginStatus status;
  final Staff? staff;
  final String? errorMessage;

  const LoginState.loading() : this(status: LoginStatus.loading);

  const LoginState.success(Staff staff)
    : this(status: LoginStatus.success, staff: staff);

  const LoginState.failure(String message)
    : this(status: LoginStatus.failure, errorMessage: message);
}

class LoginController extends Notifier<LoginState> {
  @override
  LoginState build() => const LoginState();

  Future<void> login({required String email, required String password}) async {
    state = const LoginState.loading();

    try {
      final staff = await ref
          .read(loginStaffUseCaseProvider)
          .execute(email: email, password: password);
      state = LoginState.success(staff);
    } on FormatException catch (error) {
      state = LoginState.failure(error.message);
    } on Exception catch (error) {
      state = LoginState.failure(error.toString());
    }
  }
}
