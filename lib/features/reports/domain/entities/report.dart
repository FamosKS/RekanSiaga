enum ReportStatus {
  draft,
  submitted,
  underReview,
  approved,
  rejected,
  resolved,
}

class Report {
  const Report({
    required this.id,
    required this.trackingCode,
    required this.reporterName,
    required this.reporterPhone,
    required this.title,
    required this.description,
    this.category,
    this.location,
    this.evidenceUrls = const [],
    this.status = ReportStatus.submitted,
    required this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String trackingCode;
  final String reporterName;
  final String reporterPhone;
  final String title;
  final String description;
  final String? category;
  final String? location;
  final List<String> evidenceUrls;
  final ReportStatus status;
  final DateTime createdAt;
  final DateTime? updatedAt;

  Report copyWith({
    String? id,
    String? trackingCode,
    String? reporterName,
    String? reporterPhone,
    String? title,
    String? description,
    String? category,
    String? location,
    List<String>? evidenceUrls,
    ReportStatus? status,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Report(
      id: id ?? this.id,
      trackingCode: trackingCode ?? this.trackingCode,
      reporterName: reporterName ?? this.reporterName,
      reporterPhone: reporterPhone ?? this.reporterPhone,
      title: title ?? this.title,
      description: description ?? this.description,
      category: category ?? this.category,
      location: location ?? this.location,
      evidenceUrls: evidenceUrls ?? this.evidenceUrls,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
