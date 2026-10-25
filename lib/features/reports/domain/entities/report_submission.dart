class ReportSubmission {
  const ReportSubmission({
    required this.title,
    required this.description,
    required this.reportType,
    this.latitude,
    this.longitude,
  });

  final String title;
  final String description;
  final String reportType;
  final double? latitude;
  final double? longitude;

  String? get coordinatesWkt {
    if (latitude == null || longitude == null) return null;
    return 'POINT($longitude $latitude)';
  }
}
