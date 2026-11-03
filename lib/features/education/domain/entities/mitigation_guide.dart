class MitigationGuide {
  const MitigationGuide({
    required this.id,
    required this.title,
    required this.hazardType,
    required this.content,
    this.checklist = const [],
  });

  final String id;
  final String title;
  final String hazardType;
  final String content;
  final List<MitigationChecklistItem> checklist;
}

class MitigationChecklistItem {
  const MitigationChecklistItem({
    required this.id,
    required this.description,
    required this.sortOrder,
  });

  final String id;
  final String description;
  final int sortOrder;
}
