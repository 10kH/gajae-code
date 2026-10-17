use super::{super::DescendantBaseline, Process, WALK_IDENTITY_SCRIPT, WalkIdentity};

#[test]
fn unreadable_identity_stays_unknown() {
	let self_pid = i32::try_from(std::process::id()).expect("self pid fits in i32");
	let live = Process::from_pid(self_pid).expect("live self");
	let _clear = ClearScript;
	WALK_IDENTITY_SCRIPT.with(|script| script.borrow_mut().push(WalkIdentity::Unreadable));
	assert!(live.descendants_observed().is_none(), "first lookup failure became an empty set");
	WALK_IDENTITY_SCRIPT.with(|script| {
		*script.borrow_mut() = vec![WalkIdentity::Same, WalkIdentity::Unreadable];
	});
	assert!(live.descendants_observed().is_none(), "second lookup failure became an empty set");
	WALK_IDENTITY_SCRIPT.with(|script| {
		*script.borrow_mut() = vec![WalkIdentity::Unreadable; 3];
	});
	assert!(
		!DescendantBaseline::capture().observed(),
		"unreadable identity confirmed an empty baseline"
	);
}

struct ClearScript;

impl Drop for ClearScript {
	fn drop(&mut self) {
		WALK_IDENTITY_SCRIPT.with(|script| script.borrow_mut().clear());
	}
}
