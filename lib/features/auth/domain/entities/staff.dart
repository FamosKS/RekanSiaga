enum StaffRole { superAdmin, admin, supervisor, staff }

class Staff {
  const Staff({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    required this.isActive,
  });

  final String id;
  final String email;
  final String fullName;
  final StaffRole role;
  final bool isActive;

  Staff copyWith({
    String? id,
    String? email,
    String? fullName,
    StaffRole? role,
    bool? isActive,
  }) {
    return Staff(
      id: id ?? this.id,
      email: email ?? this.email,
      fullName: fullName ?? this.fullName,
      role: role ?? this.role,
      isActive: isActive ?? this.isActive,
    );
  }
}
