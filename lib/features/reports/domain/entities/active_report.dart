class ActiveReport {
  const ActiveReport({
    required this.id,
    required this.trackingCode,
    required this.title,
    required this.description,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String trackingCode;
  final String title;
  final String description;
  final String status;
  final DateTime createdAt;
}
