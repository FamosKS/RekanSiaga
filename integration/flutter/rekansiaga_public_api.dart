// Dependency-free public READ adapter for Flutter Android/iOS/desktop.
// No report RPC, Auth provisioning, remote writes, or privileged keys.
// For Flutter web, use the team's existing HTTP/Supabase transport.
import 'dart:convert';
import 'dart:io';

const devProjectRef = 'uiuiouosblyuqgnvfpeh';
const articleColumns = 'id,author_id,title,slug,summary,content,source_url,publication_status,published_at,created_at,updated_at';

class RekansiagaConfig {
  final Uri url;
  final String publishableKey;
  RekansiagaConfig(String endpoint, this.publishableKey) : url = Uri.parse(endpoint) {
    if (url.scheme != 'https' || url.host != '$devProjectRef.supabase.co' || (url.path.isNotEmpty && url.path != '/') || url.hasQuery || url.hasFragment || url.userInfo.isNotEmpty || url.hasPort) {
      throw ArgumentError('Development must use rekansiaga-dev. Staging rejected.');
    }
    if (!RegExp(r'^sb_publishable_[A-Za-z0-9_-]+$').hasMatch(publishableKey)) {
      throw ArgumentError('Only the dev publishable key is allowed.');
    }
  }
  factory RekansiagaConfig.fromDefines() => RekansiagaConfig(
    const String.fromEnvironment('SUPABASE_URL'),
    const String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY'),
  );
}

class RekansiagaApiException implements Exception {
  final int status;
  final String code;
  RekansiagaApiException(this.status, this.code);
  @override
  String toString() => 'RekansiagaApiException(HTTP $status, $code)';
}

class RekansiagaPublicApi {
  final RekansiagaConfig config;
  final HttpClient _client;
  RekansiagaPublicApi(this.config) : _client = HttpClient()..connectionTimeout = const Duration(seconds: 12);

  Future<List<Map<String, dynamic>>> _read(String table, Map<String, String> query) async {
    final uri = config.url.replace(path: '/rest/v1/$table', queryParameters: query);
    final request = await _client.getUrl(uri).timeout(const Duration(seconds: 12));
    request.followRedirects = false;
    request.headers.set('apikey', config.publishableKey);
    request.headers.set('Authorization', 'Bearer ${config.publishableKey}');
    request.headers.set('Accept', 'application/json');
    final response = await request.close().timeout(const Duration(seconds: 12));
    final body = await utf8.decoder.bind(response).join().timeout(const Duration(seconds: 12));
    dynamic json;
    try { json = jsonDecode(body); } catch (_) { throw RekansiagaApiException(response.statusCode, 'INVALID_RESPONSE'); }
    if (response.statusCode != 200) throw RekansiagaApiException(response.statusCode, json is Map ? (json['code']?.toString() ?? 'API_ERROR') : 'API_ERROR');
    if (json is! List) throw RekansiagaApiException(response.statusCode, 'INVALID_RESPONSE');
    return json.map((row) => Map<String, dynamic>.from(row as Map)).toList();
  }
  Future<List<Map<String, dynamic>>> publishedArticles({String? slug}) => _read('articles', {
    'select': articleColumns, 'publication_status': 'eq.published', 'published_at': 'not.is.null',
    'order': 'published_at.desc', 'limit': slug == null ? '100' : '1', if (slug != null) 'slug': 'eq.$slug',
  });
  Future<List<Map<String, dynamic>>> publishedGuides() => _read('mitigation_guides', {
    'select': 'id,title,disaster_type,content,source_url,mitigation_checklist_items(phase,instruction,sort_order,is_active)',
    'publication_status': 'eq.published', 'order': 'updated_at.desc', 'limit': '100',
  });
  void close() => _client.close(force: true);
}
