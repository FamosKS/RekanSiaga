import 'package:supabase_flutter/supabase_flutter.dart';

class AdministrativeRegion {
  const AdministrativeRegion({
    required this.id,
    required this.code,
    required this.name,
    required this.level,
    this.type,
    this.parentId,
  });

  final String id;
  final String code;
  final String name;
  final String level;
  final String? type;
  final String? parentId;

  factory AdministrativeRegion.fromMap(Map<String, dynamic> map) {
    final id = map['id']?.toString() ?? '';
    return AdministrativeRegion(
      id: id,
      code: map['code']?.toString() ?? id,
      name: map['name']?.toString() ?? '',
      level: map['level']?.toString() ?? '',
      type: map['type']?.toString(),
      parentId: map['parent_id']?.toString(),
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AdministrativeRegion &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;
}

class RegionRepository {
  RegionRepository(this._client);

  final SupabaseClient _client;
  static const _pageSize = 1000;

  Future<List<AdministrativeRegion>> fetchByLevel({
    required String level,
    String? parentId,
    int limit = _pageSize,
  }) async {
    var query = _client
        .from('regions')
        .select('id, code, name, level, type, parent_id')
        .eq('level', level);

    if (parentId != null) {
      query = query.eq('parent_id', parentId);
    } else {
      query = query.isFilter('parent_id', null);
    }

    final rows = await query.order('name').limit(limit);
    return rows
        .map<AdministrativeRegion>(
          (row) => AdministrativeRegion.fromMap(Map<String, dynamic>.from(row)),
        )
        .toList(growable: false);
  }
}
