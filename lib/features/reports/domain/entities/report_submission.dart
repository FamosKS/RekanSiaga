class ReportSubmission {
  const ReportSubmission({
    required this.title,
    required this.description,
    required this.reportType,
    this.latitude,
    this.longitude,
    this.provinceCode,
    this.regencyCode,
    this.districtCode,
    this.villageCode,
  });

  final String title;
  final String description;
  final String reportType;
  final double? latitude;
  final double? longitude;
  final String? provinceCode;
  final String? regencyCode;
  final String? districtCode;
  final String? villageCode;

  String? get coordinatesWkt {
    if (latitude == null || longitude == null) return null;
    return 'POINT($longitude $latitude)';
  }
}
