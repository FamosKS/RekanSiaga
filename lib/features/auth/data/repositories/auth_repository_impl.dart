import 'package:supabase_flutter/supabase_flutter.dart';

import '../../domain/entities/staff.dart';
import '../../domain/repositories/auth_repository.dart';

class AuthRepositoryException implements Exception {
  const AuthRepositoryException(this.message);

  final String message;

  @override
  String toString() => message;
}

class AuthRepositoryImpl implements AuthRepository {
  const AuthRepositoryImpl(this._client);

  final SupabaseClient _client;

  @override
  Future<Staff> loginStaff({
    required String email,
    required String password,
  }) async {
    final response = await _client.auth.signInWithPassword(
      email: email,
      password: password,
    );
    final user = response.user;
    if (user == null) {
      throw const AuthRepositoryException(
        'Supabase Auth tidak mengembalikan identitas pengguna.',
      );
    }

    try {
      final staff = await _getStaffForUser(user);
      if (staff.role != StaffRole.superAdmin) {
        throw const AuthRepositoryException(
          'Akses ditolak. Akun staf aktif dengan role super_admin diperlukan.',
        );
      }
      return staff;
    } catch (error, stackTrace) {
      try {
        await _client.auth.signOut();
      } on Exception catch (signOutError) {
        Error.throwWithStackTrace(
          AuthRepositoryException(
            'Validasi akses staf gagal ($error), dan sesi tidak dapat '
            'dibersihkan ($signOutError).',
          ),
          stackTrace,
        );
      }
      Error.throwWithStackTrace(error, stackTrace);
    }
  }

  @override
  Future<void> logoutStaff() async {
    await _client.auth.signOut();
  }

  @override
  Future<StaffRole> getCurrentStaffRole() async {
    final staff = await getCurrentStaff();
    if (staff.role != StaffRole.superAdmin) {
      throw const AuthRepositoryException(
        'Akses ditolak. Akun staf aktif dengan role super_admin diperlukan.',
      );
    }
    return staff.role;
  }

  @override
  Future<Staff> getCurrentStaff() async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw const AuthRepositoryException('Tidak ada staf yang sedang login.');
    }

    return _getStaffForUser(user);
  }

  Future<Staff> _getStaffForUser(User user) async {
    final profile = await _client
        .from('staff_profiles')
        .select('display_name,is_active,staff_role_assignments(roles(code))')
        .eq('user_id', user.id)
        .maybeSingle();

    if (profile == null) {
      throw const AuthRepositoryException(
        'Profil staf tidak ditemukan atau tidak dapat diakses.',
      );
    }
    if (profile['is_active'] != true) {
      throw const AuthRepositoryException('Akun staf tidak aktif.');
    }

    final email = user.email;
    if (email == null || email.trim().isEmpty) {
      throw const AuthRepositoryException(
        'Akun Supabase tidak memiliki alamat email.',
      );
    }

    final displayName = profile['display_name'];
    if (displayName is! String || displayName.trim().isEmpty) {
      throw const AuthRepositoryException(
        'Nama staf tidak tersedia pada profil.',
      );
    }

    final role = _resolveRole(profile['staff_role_assignments']);
    return Staff(
      id: user.id,
      email: email,
      fullName: displayName.trim(),
      role: role,
      isActive: true,
    );
  }

  StaffRole _resolveRole(Object? rawAssignments) {
    if (rawAssignments is! List) {
      throw const AuthRepositoryException(
        'Data penetapan role staf tidak valid.',
      );
    }

    final roleCodes = <String>{};
    for (final rawAssignment in rawAssignments) {
      if (rawAssignment is! Map) {
        continue;
      }

      final rawRoles = rawAssignment['roles'];
      if (rawRoles is Map) {
        final code = rawRoles['code'];
        if (code is String) {
          roleCodes.add(code);
        }
      } else if (rawRoles is List) {
        for (final rawRole in rawRoles) {
          if (rawRole is Map && rawRole['code'] is String) {
            roleCodes.add(rawRole['code'] as String);
          }
        }
      }
    }

    if (roleCodes.contains('super_admin')) {
      return StaffRole.superAdmin;
    }
    if (roleCodes.contains('admin')) {
      return StaffRole.admin;
    }
    if (roleCodes.contains('supervisor')) {
      return StaffRole.supervisor;
    }
    if (roleCodes.contains('staff')) {
      return StaffRole.staff;
    }

    throw const AuthRepositoryException(
      'Akun tidak memiliki role staf yang dikenali.',
    );
  }
}
