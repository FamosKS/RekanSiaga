import '../entities/mitigation_guide.dart';
import '../repositories/mitigation_guide_repository.dart';

class GetMitigationGuidesUseCase {
  const GetMitigationGuidesUseCase(this._repository);

  final MitigationGuideRepository _repository;

  Future<List<MitigationGuide>> execute({String? hazardType}) {
    final normalizedHazardType = hazardType?.trim();

    return _repository.getMitigationGuides(
      hazardType: normalizedHazardType?.isEmpty == true
          ? null
          : normalizedHazardType,
    );
  }
}
