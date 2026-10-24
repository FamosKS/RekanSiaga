import '../entities/mitigation_guide.dart';

abstract interface class MitigationGuideRepository {
  Future<List<MitigationGuide>> getMitigationGuides({String? hazardType});
}
